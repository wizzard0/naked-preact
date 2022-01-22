import {a, br, button, code, details, div, h1, i, li, p, span, summary, Tag, ul, useState} from './lib/naked.js'
import {Line} from "./line.js" // import a component

let items = ['foo', 'bar', 'baz']

export let App = Tag(({}) => {
  // use hooks, see https://reactjs.org/docs/hooks-intro.html
  let [count, setCount] = useState(0)
  let rawItemArray = ['...and inline primitive arrays: ', ...items.map(x => ' ' + x)]
  return div(
    // naked <h1><i>p</i>react ...
    h1`naked ${i`p`}react`,
    span`Web development should be simple. Uses (p)react+hooks, ES2021, no compilers.`,

    p`Wrap components with Tag(), forget JSX. See ${code`index.html`} and ${code`app.js`} for examples.`,
    "The rest of this file is self-documenting. Preact devtools work as expected, too.",

    // tag with props as optional first parameter
    details({open: true, style: {background: '#dee'}},
      summary("if you don't have props you can still always stick to the call-like syntax"),
      Line(), // equivalent to Line`` or <Line /> in JSX
      ul(items.map(item => li(item))),
      // components can return VNode[] as well
      InlineArray({prefix: "array item"})
    ),

    "some buttons for dynamic stuff:",
    button({onClick: _ => setCount(++count)}, `increment ${count}`),
    button({onClick: _ => setCount(0)}, 'reset'),
    p("you can use plain JS primitives for 1: text ", 2, ": numbers",br``,
    // as well as arrays, no need for React.Fragment or <> ... </>
    rawItemArray),
    Line``,
    Author``
  )
// optional name for devtools if anonymous functions are used
}, 'App')

// names from named functions are preserved
export let InlineArray = Tag(function InlineArray({prefix}) {
  return items.map(item => p`${prefix} ${item}`)
})

export let Author = Tag(() => [
  a({href:'https://github.com/wizzard0/naked-preact'},'naked-preact@github'),", by ",
  a({href:'oleksandr@tvori.info'},'oleksandr@tvori.info'),
])

