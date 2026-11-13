// HOOK PARA RE-TIRADAS DE "ESPECIALIDAD"
Hooks.on("renderChatMessage", (message, html, data) => {
    const button = html.find('.especialidad-btn');
    if (button.length === 0) return;

    button.on("click", async (event) => {
        event.preventDefault();
        
        const dataset = event.currentTarget.dataset;
        const actorid = dataset.actorid;
        const numdice = parseInt(dataset.numdice) || 0;
        const rerolleddice = parseInt(dataset.rerolldice) || 0;
        let successes = parseInt(dataset.successes) || 0;
        const fakesuccess = parseInt(dataset.fakesuccess) || 0;
        const fakedicesuccess = parseInt(dataset.fakedicesuccess) || 0;
        const hablab = dataset.hablab || "Habilidad";
        const chatvitamess = decodeURIComponent(dataset.chatvita || "");

        const actor = game.actors.get(actorid);
        if (!actor) return ui.notifications.error("No se encontró el Actor.");

        const originalRoll = message.rolls[0];
        if (!originalRoll) return ui.notifications.error("No se encontró la tirada original.");
        
        if (rerolleddice <= 0) return ui.notifications.warn("No hay dados que repetir.");

        // LA CORRECCIÓN CLAVE: Rescatamos de la primera tirada SOLO los 5s y 6s
        let successmapping = originalRoll.terms[0].results.filter(d => d.result === 5 || d.result === 6);

        let reroll = new Roll(rerolleddice + "d6");
        await reroll.evaluate();
        
        if (game.modules.get("dice-so-nice")?.active) {
            await game.dice3d.showForRoll(reroll, game.user, true, null, null, null, message.speaker);
        }
        
        let rerollrolled = reroll.terms[0].results;
        let diceresultsrerolled = [];
        
        for (let i = 0; i < rerollrolled.length; i++) {
            diceresultsrerolled.push(rerollrolled[i].result);
            // Sumamos a los éxitos anteriores TODOS los dados nuevos relanzados
            successmapping.push(rerollrolled[i]);
        }
        
        if (numdice === 0) {
            let min_reroll = Math.min(...diceresultsrerolled);
            if (fakedicesuccess === 0) {
                if (min_reroll === 5) successes += 1;
                else if (min_reroll === 6) successes += 2;
            } else {
                let temp_succ = 0;
                if (min_reroll === 5) temp_succ += 1;
                else if (min_reroll === 6) temp_succ += 2;
                successes = Math.min(successes + temp_succ, fakesuccess);
            }
        } else {
            for (let i = 0; i < diceresultsrerolled.length; i++) {
                if (diceresultsrerolled[i] === 5) successes += 1;
                else if (diceresultsrerolled[i] === 6) successes += 2;
            }
        }
        
        let resultslabels = '';
        for (let i = 0; i < successmapping.length; i++) {
            resultslabels += '<li class="roll riwhite d6">' + reroll.terms[0].getResultLabel(successmapping[i]) + '</li>';
        }
        
        let messageTable = "<h1>" + hablab + "</h1><h2 style='text-align:center'>Usando una Especialidad</h2><div class='dice-roll'><div class='dice-result'><div class='dice-tooltip'><section class='tooltip-part'><div class='dice'><ol class='dice-rolls'>" + resultslabels + "</ol></div></section></div></div></div><hr /><h2>Éxitos: " + successes + "</h2>" + chatvitamess;
        
        await ChatMessage.create({
            user: game.user._id,
            speaker: message.speaker,
            content: messageTable,
            rolls: [reroll],
            sound: null,
            flags: { "dice-so-nice": { skip: true } }
        });

        // Eliminar el botón original para evitar spam
        const oldContent = message.content.replace(/<button class=['"]especialidad-btn['"][\s\S]*?<\/button>/, "<p><em>(Especialidad usada)</em></p>");
        await game.messages.get(message.id).update({ content: oldContent });
    });
});
// HOOK PARA RE-TIRADAS DE "ESPECIALIDAD" CON MODIFICADOR Y ARRAY
Hooks.on("renderChatMessage", (message, html, data) => {
    const button = html.find('.especialidad-mod-btn');
    if (button.length === 0) return;

    button.on("click", async (event) => {
        event.preventDefault();
        
        const dataset = event.currentTarget.dataset;
        const actorid = dataset.actorid;
        const numdice = parseInt(dataset.numdice) || 0;
        const rerolleddice = parseInt(dataset.rerolldice) || 0;
        let successes = parseInt(dataset.successes) || 0;
        const fakedicesuccess = parseInt(dataset.fakedicesuccess) || 0;
        
        let fakesuccess = [];
        try { fakesuccess = JSON.parse(dataset.fakesuccess); } catch(e) {}
        
        const hablab = dataset.hablab || "Habilidad";
        const chatvitamess = decodeURIComponent(dataset.chatvita || "");

        const actor = game.actors.get(actorid);
        if (!actor) return ui.notifications.error("No se encontró el Actor.");

        const originalRoll = message.rolls[0];
        if (!originalRoll) return ui.notifications.error("No se encontró la tirada original.");
        if (rerolleddice <= 0) return ui.notifications.warn("No hay dados que repetir.");

        // -- NUEVA LÓGICA DE DADOS VISUALES --
        let originalResults = originalRoll.terms[0].results;
        
        // 1. Separamos los éxitos de los fallos originales
        let originalSuccesses = originalResults.filter(d => d.result === 5 || d.result === 6);
        let originalFailures = originalResults.filter(d => d.result < 5);
        
        // 2. Descartamos los fallos que vamos a repetir y nos guardamos los fallos sobrantes
        let keptFailures = originalFailures.slice(rerolleddice);
        
        // 3. Empezamos la reserva visual con los éxitos y los fallos no repetidos
        let finalDiceMapping = [...originalSuccesses, ...keptFailures];

        let reroll = new Roll(rerolleddice + "d6");
        await reroll.evaluate();
        
        if (game.modules.get("dice-so-nice")?.active) {
            await game.dice3d.showForRoll(reroll, game.user, true, null, null, null, message.speaker);
        }
        
        let rerollrolled = reroll.terms[0].results;
        let diceresultsrerolled = [];
        
        for (let i = 0; i < rerollrolled.length; i++) {
            diceresultsrerolled.push(rerollrolled[i].result);
            // 4. Añadimos los dados NUEVOS a la reserva visual
            finalDiceMapping.push(rerollrolled[i]);
        }
        // ------------------------------------
        
        if (numdice <= 0) {
            let min_reroll = Math.min(...diceresultsrerolled);
            let successesrol = [];
            
            if (fakedicesuccess === 0) {
                if (min_reroll === 5) successesrol.push(1);
                else if (min_reroll === 6) successesrol.push(2);
                else successesrol.push(0);
                
                successes = Math.min(...successesrol); 
            } else {
                if (min_reroll === 5) successesrol.push(1);
                else if (min_reroll === 6) successesrol.push(2);
                else successesrol.push(0);
                
                let combined = fakesuccess.concat(successesrol);
                successes = Math.min(...combined);
            }
        } else {
            for (let i = 0; i < diceresultsrerolled.length; i++) {
                if (diceresultsrerolled[i] === 5) successes += 1;
                else if (diceresultsrerolled[i] === 6) successes += 2;
            }
        }
        
        let resultslabels = '';
        for (let i = 0; i < finalDiceMapping.length; i++) {
            resultslabels += '<li class="roll riwhite d6">' + reroll.terms[0].getResultLabel(finalDiceMapping[i]) + '</li>';
        }
        
        let messageTable = "<h1>" + hablab + "</h1><h2 style='text-align:center'>Usando una Especialidad</h2><div class='dice-roll'><div class='dice-result'><div class='dice-tooltip'><section class='tooltip-part'><div class='dice'><ol class='dice-rolls'>" + resultslabels + "</ol></div></section></div></div></div><hr /><h2>Éxitos: " + successes + "</h2>" + chatvitamess;
        
        await ChatMessage.create({
            user: game.user._id,
            speaker: message.speaker,
            content: messageTable,
            rolls: [reroll],
            sound: null,
            flags: { "dice-so-nice": { skip: true } }
        });

        const oldContent = message.content.replace(/<button class=['"]especialidad-mod-btn['"][\s\S]*?<\/button>/, "<p><em>(Especialidad usada)</em></p>");
        await game.messages.get(message.id).update({ content: oldContent });
    });
});
// HOOK PARA RE-TIRADAS DE MAGIA (OBJETIVO) SIN MODIFICADORES
Hooks.on("renderChatMessage", (message, html, data) => {
    const button = html.find('.magia-reroll-btn');
    if (button.length === 0) return;

    button.on("click", async (event) => {
        event.preventDefault();
        
        const dataset = event.currentTarget.dataset;
        const actorid = dataset.actorid;
        const rerolleddice = parseInt(dataset.rerolldice) || 0;
        let successes = parseInt(dataset.successes) || 0;
        const hablab = dataset.hablab || "Magia";
        const chatvitamess = decodeURIComponent(dataset.chatvita || "");

        const actor = game.actors.get(actorid);
        if (!actor) return ui.notifications.error("No se encontró el Actor.");

        const originalRoll = message.rolls[0];
        if (!originalRoll) return ui.notifications.error("No se encontró la tirada original.");
        if (rerolleddice <= 0) return ui.notifications.warn("No hay dados que repetir.");

        let originalResults = originalRoll.terms[0].results;
        let originalSuccesses = originalResults.filter(d => d.result === 5 || d.result === 6);
        let originalFailures = originalResults.filter(d => d.result < 5);
        
        let keptFailures = originalFailures.slice(rerolleddice);
        let finalDiceMapping = [...originalSuccesses, ...keptFailures];

        let reroll = new Roll(rerolleddice + "d6");
        await reroll.evaluate();
        
        if (game.modules.get("dice-so-nice")?.active) {
            await game.dice3d.showForRoll(reroll, game.user, true, null, null, null, message.speaker);
        }
        
        let rerollrolled = reroll.terms[0].results;
        for (let i = 0; i < rerollrolled.length; i++) {
            let res = rerollrolled[i].result;
            finalDiceMapping.push(rerollrolled[i]);
            if (res === 5) successes += 1;
            else if (res === 6) successes += 2;
        }

        let magnitudFinal = successes;
        if (magnitudFinal < 0) magnitudFinal = 0;
        
        let resultslabels = '';
        for (let i = 0; i < finalDiceMapping.length; i++) {
            resultslabels += '<li class="roll riwhite d6">' + reroll.terms[0].getResultLabel(finalDiceMapping[i]) + '</li>';
        }
        
        let messageTable = "<h1>" + hablab + "</h1><h2 style='text-align:center'>Repitiendo dados del Objetivo</h2><div class='dice-roll'><div class='dice-result'><div class='dice-tooltip'><section class='tooltip-part'><div class='dice'><ol class='dice-rolls'>" + resultslabels + "</ol></div></section></div></div></div><hr /><h2>Magnitud: " + magnitudFinal + "</h2>" + chatvitamess;
        
        await ChatMessage.create({
            user: game.user._id,
            speaker: message.speaker,
            content: messageTable,
            rolls: [reroll],
            sound: null,
            flags: { "dice-so-nice": { skip: true } }
        });

        const oldContent = message.content.replace(/<button class=['"]magia-reroll-btn['"][\s\S]*?<\/button>/, "<p><em>(Dados de Objetivo repetidos)</em></p>");
        await game.messages.get(message.id).update({ content: oldContent });
    });
});
// HOOK PARA DAÑO INCAPACITANTE (Repetir impares)
Hooks.on("renderChatMessage", (message, html, data) => {
    const button = html.find('.incapacitar-btn');
    if (button.length === 0) return;

    button.on("click", async (event) => {
        event.preventDefault();
        
        const dataset = event.currentTarget.dataset;
        const actorid = dataset.actorid;
        const rerolleddice = parseInt(dataset.rerolldice) || 0;
        const hablab = dataset.hablab || "Arma";
        
        // Rescatamos los dados pares que sacaste antes
        let evenmapping = [];
        try { evenmapping = JSON.parse(dataset.evenmapping); } catch(e) {}

        const actor = game.actors.get(actorid);
        if (!actor) return ui.notifications.error("No se encontró el Actor.");
        if (rerolleddice <= 0) return ui.notifications.warn("No hay dados impares que repetir.");

        let reroll = new Roll(rerolleddice + "d6");
        await reroll.evaluate();
        
        if (game.modules.get("dice-so-nice")?.active) {
            await game.dice3d.showForRoll(reroll, game.user, true, null, null, null, message.speaker);
        }
        
        // Empezamos la reserva final con los pares que ya teníamos
        let finalDiceMapping = [...evenmapping];
        
        // Añadimos TODOS los dados nuevos de la repetición
        let rerollrolled = reroll.terms[0].results;
        for (let i = 0; i < rerollrolled.length; i++) {
            finalDiceMapping.push(rerollrolled[i]);
        }
        
        // Construimos el HTML de los dados visuales
        let resultslabels = '';
        for (let i = 0; i < finalDiceMapping.length; i++) {
            resultslabels += '<li class="roll riwhite d6">' + reroll.terms[0].getResultLabel(finalDiceMapping[i]) + '</li>';
        }
        
        let messageTable = "<h1>Daño de " + hablab + "</h1><h2 style='text-align:center'>Daño para Incapacitar</h2><div class='dice-roll'><div class='dice-result'><div class='dice-tooltip'><section class='tooltip-part'><div class='dice'><ol class='dice-rolls'>" + resultslabels + "</ol></div></section></div></div></div>";
        
        await ChatMessage.create({
            user: game.user._id,
            speaker: message.speaker,
            content: messageTable,
            rolls: [reroll],
            sound: null,
            flags: { "dice-so-nice": { skip: true } }
        });

        // Desactivar el botón original
        const oldContent = message.content.replace(/<button class=['"]incapacitar-btn['"][\s\S]*?<\/button>/, "<p><em>(Daño para incapacitar aplicado)</em></p>");
        await game.messages.get(message.id).update({ content: oldContent });
    });
});