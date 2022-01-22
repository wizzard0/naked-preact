export {
  useCallback, useContext, useDebugValue, useEffect, useErrorBoundary, useImperativeHandle, useLayoutEffect, useMemo, useReducer, useRef, useState,
} from './preact-hooks.js'
export {
  Component, Fragment, cloneElement, createContext, createElement, createRef, h, hydrate, isValidElement, options, render, toChildArray,
} from './preact.js'
import {
  Component, Fragment, cloneElement, createContext, createElement, createRef, h, hydrate, isValidElement, options, render, toChildArray,
} from './preact.js'
// you can inline preact.js and preact-hooks.js completely, but I prefer them in separate files for readability

// inline preact/devtools@10.6.4, should be "before everything you import" as preact docs say
function initDevTools() {
  if (typeof window != 'undefined' && window.__PREACT_DEVTOOLS__) {
    window.__PREACT_DEVTOOLS__.attachPreact('10.6.4', options, {Fragment, Component});
  }
}

initDevTools();

/**
 * Display a custom label for a custom hook for the devtools panel
 * @type {<T>(value: T, name: string) => T}
 */
export function addHookName(value, name) {
  options?._addHookName(name)
  return value;
}

// end preact/devtools
// begin Naked Preact

function interleave(a, b) {
  let [first, ...rest] = a;
  let ret = [first]
  for (let i = 0; i < rest.length; i++) {
    ret.push(b[i], rest[i])
  }
  return ret;
}

function hh(tag, ...maybeProps) {
  // and no-args ttm is ok, but setting args is not :/
  if (maybeProps.length && maybeProps[0].raw) { // p`some${children} {moreChildren}`
    let [strings, ...children] = maybeProps
    return h(tag, null, interleave(strings, children))
  }
  if (maybeProps.length && maybeProps[0].constructor === Object) {
    let [args, ...children] = maybeProps
    return h(tag, args, children) // p({onClick:...}, child1, child2)
  } else {
    return h(tag, null, maybeProps) // p(child1, "child2", child3)
  }
}

// public exports below

// wrap your preact components so you can compose them without JSX
export function Tag(fn, name) {
  let bound = hh.bind(null, fn)
  if (name) {fn.displayName = name;}
  return bound
}

// I'm sure this misses a lot of tags... you can make your own tags the same way though
// noinspection JSUnusedGlobalSymbols
export let [a, abbr, b,br, button, canvas, cite, code, command, details, div, footer,form, h1, h2, h3, h4, h5, h6, head, header, hr, i, iframe, img, input, label, li, link, map, menu, meta, nav, noscript, objectTag, ol, optgroup, option, p, param, pre, s, script, section, select, span, strong, style, summary, table, tbody, td, textarea, tfoot, th, thead, time, title, tr, track, u, ul, video, wbr] = ('a,abbr,b,br,button,canvas,cite,code,command,details,div,footer,form,h1,h2,h3,h4,h5,h6,head,header,hr,i,iframe,' + 'img,input,label,li,link,map,menu,meta,nav,noscript,object,ol,optgroup,option,p,param,pre,s,script,' + 'section,select,span,strong,style,summary,table,tbody,td,textarea,tfoot,th,thead,time,title,tr,track,u,ul,video,wbr')
  .split(',').map(tag => hh.bind(null, tag))

// start the app :)
export function StartApp(rootTag, props = null) {
  if (document.readyState !== 'loading') {
    render(h(rootTag, props), document.body)
  } else {
    document.addEventListener("DOMContentLoaded", () => render(h(rootTag, props), document.body))
  }
}
