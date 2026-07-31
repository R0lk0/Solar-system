# Solar-system
This is a program that is used to simulate the different gravitational pulls and orbits of planets.
You can either use the preloaded planets or create a custom one in the tabs on the left.
Everything is proportional and true-to-size except for the planets' size (you could barely see them if they were true scale).
The Sun is stationary by default and cannot be influenced by gravity, but you can change this by changing "true" to "false" on line 239 in script.js.
The orbit predictions are just circles calculated from the distance of the parent planet, so in elliptic orbits it may be incorrect (this was due to hardware limitations and it is planned to be patched).
Collisions aren't implemented yet.

You have to use the Live Server extension in VSCode to open the program because otherwise it can't reach the presets from the json file.
