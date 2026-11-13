Hooks.once('diceSoNiceReady', (dice3d) => {
    dice3d.addSystem({id:"UADice",name:"Dados Urbs Aeterna"},"preferred");
    dice3d.addDicePreset({
      type:"d6",
      labels:[
        '1', 
        '2', 
        '3', 
        '4',
        '5', 
        '6'
      ],
	  font:"RomanNumerals",
	  fontScale: 1.7,
      system: "UADice"
    });
});