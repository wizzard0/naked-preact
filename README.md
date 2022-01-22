# [naked preact]

## [preact.js] with hooks, without compilers

Web development should be simple.

No compilers, just ES2021 and preact+hooks. See comments in the code.

The only downside is that it won't work with file:// URLs. 

Various http servers you can use:

- `python3 -m http.server 7421` 
- `npx http-server -c-1 -p7421`
- `dotnet tool install --global dotnet-serve; dotnet serve -p7421`

...then open http://localhost:7421/ in your browser and play with `app.js`/`index.html` etc.  
Oh, and don't forget [Preact Devtools]. They work out of the box.

[naked preact]: https://github.com/wizzard0/naked-preact
[preact.js]: https://preactjs.com/
[Preact Devtools]: https://preactjs.github.io/preact-devtools/
