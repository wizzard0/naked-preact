// preact@10.6.4 (ce35a253) non-minified rollup v0.67.4
// rollup --format=esm  --file=dist/preact.full.js -- src/index.js
// bundled bc circular deps and not intended to be used without bundling IIUC
// see https://github.com/preactjs/preact/issues/1507
// inspections suppressed assuming preact is bug-free :D
// noinspection JSUnresolvedVariable,JSValidateJSDoc,EqualityComparisonWithCoercionJS,JSCommentMatchesSignature

const EMPTY_OBJ = {};
const EMPTY_ARR = [];
const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;

/**
 * Assign properties from `props` to `obj`
 * @template O, P The obj and props types
 * @param {O} obj The object to copy properties to
 * @param {P} props The object to copy properties from
 * @returns {O & P}
 */
function assign(obj, props) {
  // @ts-ignore We change the type of `obj` to be `O & P`
  for (let i in props) obj[i] = props[i];
  return /** @type {O & P} */ (obj);
}

/**
 * Remove a child node from its parent if attached. This is a workaround for
 * IE11 which doesn't support `Element.prototype.remove()`. Using this function
 * is smaller than including a dedicated polyfill.
 * @param {Node} node The node to remove
 */
function removeNode(node) {
  let parentNode = node.parentNode;
  if (parentNode) {
    parentNode.removeChild(node);
  }
}

const slice = EMPTY_ARR.slice;

/**
 * Find the closest error boundary to a thrown error and call it
 * @param {object} error The thrown value
 * @param {import('../internal').VNode} vnode The vnode that threw
 * the error that was caught (except for unmounting when this parameter
 * is the highest parent that was being unmounted)
 */
function _catchError(error, vnode) {
  /** @type {import('../internal').Component} */
  let component, ctor, handled;

  for (; (vnode = vnode._parent);) {
    if ((component = vnode._component) && !component._processingException) {
      try {
        ctor = component.constructor;

        if (ctor && ctor.getDerivedStateFromError != null) {
          component.setState(ctor.getDerivedStateFromError(error));
          handled = component._dirty;
        }

        if (component.componentDidCatch != null) {
          component.componentDidCatch(error);
          handled = component._dirty;
        }

        // This is an error boundary. Mark it as having bailed out, and whether it was mid-hydration.
        if (handled) {
          return (component._pendingError = component);
        }
      } catch (e) {
        error = e;
      }
    }
  }

  throw error;
}

/**
 * The `option` object can potentially contain callback functions
 * that are called during various stages of our renderer. This is the
 * foundation on which all our addons like `preact/debug`, `preact/compat`,
 * and `preact/hooks` are based on. See the `Options` type in `internal.d.ts`
 * for a full list of available option hooks (most editors/IDEs allow you to
 * ctrl+click or cmd+click on mac the type definition below).
 * @type {import('./internal').Options}
 */
const options = {
  _catchError
};

let vnodeId = 0;

/**
 * Create an virtual node (used for JSX)
 * @param {import('./internal').VNode["type"]} type The node name or Component
 * constructor for this virtual node
 * @param {object | null | undefined} [props] The properties of the virtual node
 * @param {Array<import('.').ComponentChildren>} [children] The children of the virtual node
 * @returns {import('./internal').VNode}
 */
function createElement(type, props, children) {
  let normalizedProps = {},
    key,
    ref,
    i;
  for (i in props) {
    if (i == 'key') {
      key = props[i];
    } else if (i == 'ref') {
      ref = props[i];
    } else {
      normalizedProps[i] = props[i];
    }
  }

  if (arguments.length > 2) {
    normalizedProps.children =
      arguments.length > 3 ? slice.call(arguments, 2) : children;
  }

  // If a Component VNode, check for and apply defaultProps
  // Note: type may be undefined in development, must never error here.
  if (typeof type == 'function' && type.defaultProps != null) {
    for (i in type.defaultProps) {
      if (normalizedProps[i] === undefined) {
        normalizedProps[i] = type.defaultProps[i];
      }
    }
  }

  return createVNode(type, normalizedProps, key, ref, null);
}

/**
 * Create a VNode (used internally by Preact)
 * @param {import('./internal').VNode["type"]} type The node name or Component
 * Constructor for this virtual node
 * @param {object | string | number | null} props The properties of this virtual node.
 * If this virtual node represents a text node, this is the text of the node (string or number).
 * @param {string | number | null} key The key for this virtual node, used when
 * diffing it against its children
 * @param {import('./internal').VNode["ref"]} ref The ref property that will
 * receive a reference to its created child
 * @returns {import('./internal').VNode}
 */
function createVNode(type, props, key, ref, original) {
  // V8 seems to be better at detecting type shapes if the object is allocated from the same call site
  // Do not inline into createElement and coerceToVNode!
  const vnode = {
    type,
    props,
    key,
    ref,
    _children: null,
    _parent: null,
    _depth: 0,
    _dom: null,
    // _nextDom must be initialized to undefined b/c it will eventually
    // be set to dom.nextSibling which can return `null` and it is important
    // to be able to distinguish between an uninitialized _nextDom and
    // a _nextDom that has been set to `null`
    _nextDom: undefined,
    _component: null,
    _hydrating: null,
    constructor: undefined,
    _original: original == null ? ++vnodeId : original
  };

  // Only invoke the vnode hook if this was *not* a direct copy:
  if (original == null && options.vnode != null) {
    options.vnode(vnode);
  }

  return vnode;
}

function createRef() {
  return {current: null};
}

function Fragment(props) {
  return props.children;
}

/**
 * Check if a the argument is a valid Preact VNode.
 * @param {*} vnode
 * @returns {vnode is import('./internal').VNode}
 */
const isValidElement = vnode =>
  vnode != null && vnode.constructor === undefined;

/**
 * Base Component class. Provides `setState()` and `forceUpdate()`, which
 * trigger rendering
 * @param {object} props The initial component props
 * @param {object} context The initial context from parent components'
 * getChildContext
 */
function Component(props, context) {
  this.props = props;
  this.context = context;
}

/**
 * Update component state and schedule a re-render.
 * @this {import('./internal').Component}
 * @param {object | ((s: object, p: object) => object)} update A hash of state
 * properties to update with new values or a function that given the current
 * state and props returns a new partial state
 * @param {() => void} [callback] A function to be called once component state is
 * updated
 */
Component.prototype.setState = function (update, callback) {
  // only clone state when copying to nextState the first time.
  let s;
  if (this._nextState != null && this._nextState !== this.state) {
    s = this._nextState;
  } else {
    s = this._nextState = assign({}, this.state);
  }

  if (typeof update == 'function') {
    // Some libraries like `immer` mark the current state as readonly,
    // preventing us from mutating it, so we need to clone it. See #2716
    update = update(assign({}, s), this.props);
  }

  if (update) {
    assign(s, update);
  }

  // Skip update if updater function returned null
  if (update == null) {
    return;
  }

  if (this._vnode) {
    if (callback) {
      this._renderCallbacks.push(callback);
    }
    enqueueRender(this);
  }
};

/**
 * Immediately perform a synchronous re-render of the component
 * @this {import('./internal').Component}
 * @param {() => void} [callback] A function to be called after component is
 * re-rendered
 */
Component.prototype.forceUpdate = function (callback) {
  if (this._vnode) {
    // Set render mode so that we can differentiate where the render request
    // is coming from. We need this because forceUpdate should never call
    // shouldComponentUpdate
    this._force = true;
    if (callback) {
      this._renderCallbacks.push(callback);
    }
    enqueueRender(this);
  }
};

/**
 * Accepts `props` and `state`, and returns a new Virtual DOM tree to build.
 * Virtual DOM is generally constructed via [JSX](http://jasonformat.com/wtf-is-jsx).
 * @param {object} props Props (eg: JSX attributes) received from parent
 * element/component
 * @param {object} state The component's current state
 * @param {object} context Context object, as returned by the nearest
 * ancestor's `getChildContext()`
 * @returns {import('./index').ComponentChildren | void}
 */
Component.prototype.render = Fragment;

/**
 * @param {import('./internal').VNode} vnode
 * @param {number | null} [childIndex]
 */
function getDomSibling(vnode, childIndex) {
  if (childIndex == null) {
    // Use childIndex==null as a signal to resume the search from the vnode's sibling
    return vnode._parent
      ? getDomSibling(vnode._parent, vnode._parent._children.indexOf(vnode) + 1)
      : null;
  }

  let sibling;
  for (; childIndex < vnode._children.length; childIndex++) {
    sibling = vnode._children[childIndex];

    if (sibling != null && sibling._dom != null) {
      // Since updateParentDomPointers keeps _dom pointer correct,
      // we can rely on _dom to tell us if this subtree contains a
      // rendered DOM node, and what the first rendered DOM node is
      return sibling._dom;
    }
  }

  // If we get here, we have not found a DOM node in this vnode's children.
  // We must resume from this vnode's sibling (in it's parent _children array)
  // Only climb up and search the parent if we aren't searching through a DOM
  // VNode (meaning we reached the DOM parent of the original vnode that began
  // the search)
  return typeof vnode.type == 'function' ? getDomSibling(vnode) : null;
}

/**
 * Trigger in-place re-rendering of a component.
 * @param {import('./internal').Component} component The component to rerender
 */
function renderComponent(component) {
  let vnode = component._vnode,
    oldDom = vnode._dom,
    parentDom = component._parentDom;

  if (parentDom) {
    let commitQueue = [];
    const oldVNode = assign({}, vnode);
    oldVNode._original = vnode._original + 1;

    diff(
      parentDom,
      vnode,
      oldVNode,
      component._globalContext,
      parentDom.ownerSVGElement !== undefined,
      vnode._hydrating != null ? [oldDom] : null,
      commitQueue,
      oldDom == null ? getDomSibling(vnode) : oldDom,
      vnode._hydrating
    );
    commitRoot(commitQueue, vnode);

    if (vnode._dom != oldDom) {
      updateParentDomPointers(vnode);
    }
  }
}

/**
 * @param {import('./internal').VNode} vnode
 */
function updateParentDomPointers(vnode) {
  if ((vnode = vnode._parent) != null && vnode._component != null) {
    vnode._dom = vnode._component.base = null;
    for (let i = 0; i < vnode._children.length; i++) {
      let child = vnode._children[i];
      if (child != null && child._dom != null) {
        vnode._dom = vnode._component.base = child._dom;
        break;
      }
    }

    return updateParentDomPointers(vnode);
  }
}

/**
 * The render queue
 * @type {Array<import('./internal').Component>}
 */
let rerenderQueue = [];

/**
 * Asynchronously schedule a callback
 * @type {(cb: () => void) => void}
 */
/* istanbul ignore next */
// Note the following line isn't tree-shaken by rollup cuz of rollup/rollup#2566
const defer =
  typeof Promise == 'function'
    ? Promise.prototype.then.bind(Promise.resolve())
    : setTimeout;

/*
 * The value of `Component.debounce` must asynchronously invoke the passed in callback. It is
 * important that contributors to Preact can consistently reason about what calls to `setState`, etc.
 * do, and when their effects will be applied. See the links below for some further reading on designing
 * asynchronous APIs.
 * * [Designing APIs for Asynchrony](https://blog.izs.me/2013/08/designing-apis-for-asynchrony)
 * * [Callbacks synchronous and asynchronous](https://blog.ometer.com/2011/07/24/callbacks-synchronous-and-asynchronous/)
 */

let prevDebounce;

/**
 * Enqueue a rerender of a component
 * @param {import('./internal').Component} c The component to rerender
 */
function enqueueRender(c) {
  if (
    (!c._dirty &&
      (c._dirty = true) &&
      rerenderQueue.push(c) &&
      !process._rerenderCount++) ||
    prevDebounce !== options.debounceRendering
  ) {
    prevDebounce = options.debounceRendering;
    (prevDebounce || defer)(process);
  }
}

/** Flush the render queue by rerendering all queued components */
function process() {
  let queue;
  while ((process._rerenderCount = rerenderQueue.length)) {
    queue = rerenderQueue.sort((a, b) => a._vnode._depth - b._vnode._depth);
    rerenderQueue = [];
    // Don't update `renderCount` yet. Keep its value non-zero to prevent unnecessary
    // process() calls from getting scheduled while `queue` is still being consumed.
    queue.some(c => {
      if (c._dirty) {
        renderComponent(c);
      }
    });
  }
}

process._rerenderCount = 0;

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../internal').ComponentChildren[]} renderResult
 * @param {import('../internal').VNode} newParentVNode The new virtual
 * node whose children should be diff'ed against oldParentVNode
 * @param {import('../internal').VNode} oldParentVNode The old virtual
 * node whose children should be diff'ed against newParentVNode
 * @param {object} globalContext The current context object - modified by getChildContext
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} isHydrating Whether or not we are in hydration
 */
function diffChildren(
  parentDom,
  renderResult,
  newParentVNode,
  oldParentVNode,
  globalContext,
  isSvg,
  excessDomChildren,
  commitQueue,
  oldDom,
  isHydrating
) {
  let i, j, oldVNode, childVNode, newDom, firstChildDom, refs;

  // This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
  // as EMPTY_OBJ._children should be `undefined`.
  let oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;

  let oldChildrenLength = oldChildren.length;

  newParentVNode._children = [];
  for (i = 0; i < renderResult.length; i++) {
    childVNode = renderResult[i];

    if (childVNode == null || typeof childVNode == 'boolean') {
      childVNode = newParentVNode._children[i] = null;
    }
      // If this newVNode is being reused (e.g. <div>{reuse}{reuse}</div>) in the same diff,
      // or we are rendering a component (e.g. setState) copy the oldVNodes so it can have
    // it's own DOM & etc. pointers
    else if (
      typeof childVNode == 'string' ||
      typeof childVNode == 'number' ||
      // eslint-disable-next-line valid-typeof
      typeof childVNode == 'bigint'
    ) {
      childVNode = newParentVNode._children[i] = createVNode(
        null,
        childVNode,
        null,
        null,
        childVNode
      );
    } else if (Array.isArray(childVNode)) {
      childVNode = newParentVNode._children[i] = createVNode(
        Fragment,
        {children: childVNode},
        null,
        null,
        null
      );
    } else if (childVNode._depth > 0) {
      // VNode is already in use, clone it. This can happen in the following
      // scenario:
      //   const reuse = <div />
      //   <div>{reuse}<span />{reuse}</div>
      childVNode = newParentVNode._children[i] = createVNode(
        childVNode.type,
        childVNode.props,
        childVNode.key,
        null,
        childVNode._original
      );
    } else {
      childVNode = newParentVNode._children[i] = childVNode;
    }

    // Terser removes the `continue` here and wraps the loop body
    // in a `if (childVNode) { ... } condition
    if (childVNode == null) {
      continue;
    }

    childVNode._parent = newParentVNode;
    childVNode._depth = newParentVNode._depth + 1;

    // Check if we find a corresponding element in oldChildren.
    // If found, delete the array item by setting to `undefined`.
    // We use `undefined`, as `null` is reserved for empty placeholders
    // (holes).
    oldVNode = oldChildren[i];

    if (
      oldVNode === null ||
      (oldVNode &&
        childVNode.key == oldVNode.key &&
        childVNode.type === oldVNode.type)
    ) {
      oldChildren[i] = undefined;
    } else {
      // Either oldVNode === undefined or oldChildrenLength > 0,
      // so after this loop oldVNode == null or oldVNode is a valid value.
      for (j = 0; j < oldChildrenLength; j++) {
        oldVNode = oldChildren[j];
        // If childVNode is unkeyed, we only match similarly unkeyed nodes, otherwise we match by key.
        // We always match by type (in either case).
        if (
          oldVNode &&
          childVNode.key == oldVNode.key &&
          childVNode.type === oldVNode.type
        ) {
          oldChildren[j] = undefined;
          break;
        }
        oldVNode = null;
      }
    }

    oldVNode = oldVNode || EMPTY_OBJ;

    // Morph the old element into the new one, but don't append it to the dom yet
    diff(
      parentDom,
      childVNode,
      oldVNode,
      globalContext,
      isSvg,
      excessDomChildren,
      commitQueue,
      oldDom,
      isHydrating
    );

    newDom = childVNode._dom;

    if ((j = childVNode.ref) && oldVNode.ref != j) {
      if (!refs) {
        refs = [];
      }
      if (oldVNode.ref) {
        refs.push(oldVNode.ref, null, childVNode);
      }
      refs.push(j, childVNode._component || newDom, childVNode);
    }

    if (newDom != null) {
      if (firstChildDom == null) {
        firstChildDom = newDom;
      }

      if (
        typeof childVNode.type == 'function' &&
        childVNode._children === oldVNode._children
      ) {
        childVNode._nextDom = oldDom = reorderChildren(
          childVNode,
          oldDom,
          parentDom
        );
      } else {
        oldDom = placeChild(
          parentDom,
          childVNode,
          oldVNode,
          oldChildren,
          newDom,
          oldDom
        );
      }

      if (typeof newParentVNode.type == 'function') {
        // Because the newParentVNode is Fragment-like, we need to set it's
        // _nextDom property to the nextSibling of its last child DOM node.
        //
        // `oldDom` contains the correct value here because if the last child
        // is a Fragment-like, then oldDom has already been set to that child's _nextDom.
        // If the last child is a DOM VNode, then oldDom will be set to that DOM
        // node's nextSibling.
        newParentVNode._nextDom = oldDom;
      }
    } else if (
      oldDom &&
      oldVNode._dom == oldDom &&
      oldDom.parentNode != parentDom
    ) {
      // The above condition is to handle null placeholders. See test in placeholder.test.js:
      // `efficiently replace null placeholders in parent rerenders`
      oldDom = getDomSibling(oldVNode);
    }
  }

  newParentVNode._dom = firstChildDom;

  // Remove remaining oldChildren if there are any.
  for (i = oldChildrenLength; i--;) {
    if (oldChildren[i] != null) {
      if (
        typeof newParentVNode.type == 'function' &&
        oldChildren[i]._dom != null &&
        oldChildren[i]._dom == newParentVNode._nextDom
      ) {
        // If the newParentVNode.__nextDom points to a dom node that is about to
        // be unmounted, then get the next sibling of that vnode and set
        // _nextDom to it
        newParentVNode._nextDom = getDomSibling(oldParentVNode, i + 1);
      }

      unmount(oldChildren[i], oldChildren[i]);
    }
  }

  // Set refs only after unmount
  if (refs) {
    for (i = 0; i < refs.length; i++) {
      applyRef(refs[i], refs[++i], refs[++i]);
    }
  }
}

function reorderChildren(childVNode, oldDom, parentDom) {
  // Note: VNodes in nested suspended trees may be missing _children.
  let c = childVNode._children;
  let tmp = 0;
  for (; c && tmp < c.length; tmp++) {
    let vnode = c[tmp];
    if (vnode) {
      // We typically enter this code path on sCU bailout, where we copy
      // oldVNode._children to newVNode._children. If that is the case, we need
      // to update the old children's _parent pointer to point to the newVNode
      // (childVNode here).
      vnode._parent = childVNode;

      if (typeof vnode.type == 'function') {
        oldDom = reorderChildren(vnode, oldDom, parentDom);
      } else {
        oldDom = placeChild(
          parentDom,
          vnode,
          vnode,
          c,
          vnode._dom,
          oldDom
        );
      }
    }
  }

  return oldDom;
}

/**
 * Flatten and loop through the children of a virtual node
 * @param {import('../index').ComponentChildren} children The unflattened
 * children of a virtual node
 * @returns {import('../internal').VNode[]}
 */
function toChildArray(children, out) {
  out = out || [];
  if (children == null || typeof children == 'boolean') {
  } else if (Array.isArray(children)) {
    children.some(child => {
      toChildArray(child, out);
    });
  } else {
    out.push(children);
  }
  return out;
}

function placeChild(
  parentDom,
  childVNode,
  oldVNode,
  oldChildren,
  newDom,
  oldDom
) {
  let nextDom;
  if (childVNode._nextDom !== undefined) {
    // Only Fragments or components that return Fragment like VNodes will
    // have a non-undefined _nextDom. Continue the diff from the sibling
    // of last DOM child of this child VNode
    nextDom = childVNode._nextDom;

    // Eagerly cleanup _nextDom. We don't need to persist the value because
    // it is only used by `diffChildren` to determine where to resume the diff after
    // diffing Components and Fragments. Once we store it the nextDOM local var, we
    // can clean up the property
    childVNode._nextDom = undefined;
  } else if (
    oldVNode == null ||
    newDom != oldDom ||
    newDom.parentNode == null
  ) {
    outer: if (oldDom == null || oldDom.parentNode !== parentDom) {
      parentDom.appendChild(newDom);
      nextDom = null;
    } else {
      // `j<oldChildrenLength; j+=2` is an alternative to `j++<oldChildrenLength/2`
      for (
        let sibDom = oldDom, j = 0;
        (sibDom = sibDom.nextSibling) && j < oldChildren.length;
        j += 2
      ) {
        if (sibDom == newDom) {
          break outer;
        }
      }
      parentDom.insertBefore(newDom, oldDom);
      nextDom = oldDom;
    }
  }

  // If we have pre-calculated the nextDOM node, use it. Else calculate it now
  // Strictly check for `undefined` here cuz `null` is a valid value of `nextDom`.
  // See more detail in create-element.js:createVNode
  if (nextDom !== undefined) {
    oldDom = nextDom;
  } else {
    oldDom = newDom.nextSibling;
  }

  return oldDom;
}

/**
 * Diff the old and new properties of a VNode and apply changes to the DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to apply
 * changes to
 * @param {object} newProps The new props
 * @param {object} oldProps The old props
 * @param {boolean} isSvg Whether or not this node is an SVG node
 * @param {boolean} hydrate Whether or not we are in hydration mode
 */
function diffProps(dom, newProps, oldProps, isSvg, hydrate) {
  let i;

  for (i in oldProps) {
    if (i !== 'children' && i !== 'key' && !(i in newProps)) {
      setProperty(dom, i, null, oldProps[i], isSvg);
    }
  }

  for (i in newProps) {
    if (
      (!hydrate || typeof newProps[i] == 'function') &&
      i !== 'children' &&
      i !== 'key' &&
      i !== 'value' &&
      i !== 'checked' &&
      oldProps[i] !== newProps[i]
    ) {
      setProperty(dom, i, newProps[i], oldProps[i], isSvg);
    }
  }
}

function setStyle(style, key, value) {
  if (key[0] === '-') {
    style.setProperty(key, value);
  } else if (value == null) {
    style[key] = '';
  } else if (typeof value != 'number' || IS_NON_DIMENSIONAL.test(key)) {
    style[key] = value;
  } else {
    style[key] = value + 'px';
  }
}

/**
 * Set a property value on a DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to modify
 * @param {string} name The name of the property to set
 * @param {*} value The value to set the property to
 * @param {*} oldValue The old value the property had
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node or not
 */
function setProperty(dom, name, value, oldValue, isSvg) {
  let useCapture;

  o: if (name === 'style') {
    if (typeof value == 'string') {
      dom.style.cssText = value;
    } else {
      if (typeof oldValue == 'string') {
        dom.style.cssText = oldValue = '';
      }

      if (oldValue) {
        for (name in oldValue) {
          if (!(value && name in value)) {
            setStyle(dom.style, name, '');
          }
        }
      }

      if (value) {
        for (name in value) {
          if (!oldValue || value[name] !== oldValue[name]) {
            setStyle(dom.style, name, value[name]);
          }
        }
      }
    }
  }
  // Benchmark for comparison: https://esbench.com/bench/574c954bdb965b9a00965ac6
  else if (name[0] === 'o' && name[1] === 'n') {
    useCapture = name !== (name = name.replace(/Capture$/, ''));

    // Infer correct casing for DOM built-in events:
    if (name.toLowerCase() in dom) {
      name = name.toLowerCase().slice(2);
    } else {
      name = name.slice(2);
    }

    if (!dom._listeners) {
      dom._listeners = {};
    }
    dom._listeners[name + useCapture] = value;

    if (value) {
      if (!oldValue) {
        const handler = useCapture ? eventProxyCapture : eventProxy;
        dom.addEventListener(name, handler, useCapture);
      }
    } else {
      const handler = useCapture ? eventProxyCapture : eventProxy;
      dom.removeEventListener(name, handler, useCapture);
    }
  } else if (name !== 'dangerouslySetInnerHTML') {
    if (isSvg) {
      // Normalize incorrect prop usage for SVG:
      // - xlink:href / xlinkHref --> href (xlink:href was removed from SVG and isn't needed)
      // - className --> class
      name = name.replace(/xlink[H:h]/, 'h').replace(/sName$/, 's');
    } else if (
      name !== 'href' &&
      name !== 'list' &&
      name !== 'form' &&
      // Default value in browsers is `-1` and an empty string is
      // cast to `0` instead
      name !== 'tabIndex' &&
      name !== 'download' &&
      name in dom
    ) {
      try {
        dom[name] = value == null ? '' : value;
        // labelled break is 1b smaller here than a return statement (sorry)
        break o;
      } catch (e) {}
    }

    // ARIA-attributes have a different notion of boolean values.
    // The value `false` is different from the attribute not
    // existing on the DOM, so we can't remove it. For non-boolean
    // ARIA-attributes we could treat false as a removal, but the
    // amount of exceptions would cost us too many bytes. On top of
    // that other VDOM frameworks also always stringify `false`.

    if (typeof value === 'function') {
    } else if (
      value != null &&
      (value !== false || (name[0] === 'a' && name[1] === 'r'))
    ) {
      dom.setAttribute(name, value);
    } else {
      dom.removeAttribute(name);
    }
  }
}

/**
 * Proxy an event to hooked event handlers
 * @param {Event} e The event object from the browser
 * @private
 */
function eventProxy(e) {
  this._listeners[e.type + false](options.event ? options.event(e) : e);
}

function eventProxyCapture(e) {
  this._listeners[e.type + true](options.event ? options.event(e) : e);
}

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} [isHydrating] Whether or not we are in hydration
 */
function diff(
  parentDom,
  newVNode,
  oldVNode,
  globalContext,
  isSvg,
  excessDomChildren,
  commitQueue,
  oldDom,
  isHydrating
) {
  let tmp,
    newType = newVNode.type;

  // When passing through createElement it assigns the object
  // constructor as undefined. This to prevent JSON-injection.
  if (newVNode.constructor !== undefined) {
    return null;
  }

  // If the previous diff bailed out, resume creating/hydrating.
  if (oldVNode._hydrating != null) {
    isHydrating = oldVNode._hydrating;
    oldDom = newVNode._dom = oldVNode._dom;
    // if we resume, we want the tree to be "unlocked"
    newVNode._hydrating = null;
    excessDomChildren = [oldDom];
  }

  if ((tmp = options._diff)) {
    tmp(newVNode);
  }

  try {
    outer: if (typeof newType == 'function') {
      let c, isNew, oldProps, oldState, snapshot, clearProcessingException;
      let newProps = newVNode.props;

      // Necessary for createContext api. Setting this property will pass
      // the context value as `this.context` just for this component.
      tmp = newType.contextType;
      let provider = tmp && globalContext[tmp._id];
      let componentContext = tmp
        ? provider
          ? provider.props.value
          : tmp._defaultValue
        : globalContext;

      // Get component and set it to `c`
      if (oldVNode._component) {
        c = newVNode._component = oldVNode._component;
        clearProcessingException = c._processingException = c._pendingError;
      } else {
        // Instantiate the new component
        if ('prototype' in newType && newType.prototype.render) {
          // @ts-ignore The check above verifies that newType is suppose to be constructed
          newVNode._component = c = new newType(newProps, componentContext); // eslint-disable-line new-cap
        } else {
          // @ts-ignore Trust me, Component implements the interface we want
          newVNode._component = c = new Component(newProps, componentContext);
          c.constructor = newType;
          c.render = doRender;
        }
        if (provider) {
          provider.sub(c);
        }

        c.props = newProps;
        if (!c.state) {
          c.state = {};
        }
        c.context = componentContext;
        c._globalContext = globalContext;
        isNew = c._dirty = true;
        c._renderCallbacks = [];
      }

      // Invoke getDerivedStateFromProps
      if (c._nextState == null) {
        c._nextState = c.state;
      }
      if (newType.getDerivedStateFromProps != null) {
        if (c._nextState == c.state) {
          c._nextState = assign({}, c._nextState);
        }

        assign(
          c._nextState,
          newType.getDerivedStateFromProps(newProps, c._nextState)
        );
      }

      oldProps = c.props;
      oldState = c.state;

      // Invoke pre-render lifecycle methods
      if (isNew) {
        if (
          newType.getDerivedStateFromProps == null &&
          c.componentWillMount != null
        ) {
          c.componentWillMount();
        }

        if (c.componentDidMount != null) {
          c._renderCallbacks.push(c.componentDidMount);
        }
      } else {
        if (
          newType.getDerivedStateFromProps == null &&
          newProps !== oldProps &&
          c.componentWillReceiveProps != null
        ) {
          c.componentWillReceiveProps(newProps, componentContext);
        }

        if (
          (!c._force &&
            c.shouldComponentUpdate != null &&
            c.shouldComponentUpdate(
              newProps,
              c._nextState,
              componentContext
            ) === false) ||
          newVNode._original === oldVNode._original
        ) {
          c.props = newProps;
          c.state = c._nextState;
          // More info about this here: https://gist.github.com/JoviDeCroock/bec5f2ce93544d2e6070ef8e0036e4e8
          if (newVNode._original !== oldVNode._original) {
            c._dirty = false;
          }
          c._vnode = newVNode;
          newVNode._dom = oldVNode._dom;
          newVNode._children = oldVNode._children;
          newVNode._children.forEach(vnode => {
            if (vnode) {
              vnode._parent = newVNode;
            }
          });
          if (c._renderCallbacks.length) {
            commitQueue.push(c);
          }

          break outer;
        }

        if (c.componentWillUpdate != null) {
          c.componentWillUpdate(newProps, c._nextState, componentContext);
        }

        if (c.componentDidUpdate != null) {
          c._renderCallbacks.push(() => {
            c.componentDidUpdate(oldProps, oldState, snapshot);
          });
        }
      }

      c.context = componentContext;
      c.props = newProps;
      c.state = c._nextState;

      if ((tmp = options._render)) {
        tmp(newVNode);
      }

      c._dirty = false;
      c._vnode = newVNode;
      c._parentDom = parentDom;

      tmp = c.render(c.props, c.state, c.context);

      // Handle setState called in render, see #2553
      c.state = c._nextState;

      if (c.getChildContext != null) {
        globalContext = assign(assign({}, globalContext), c.getChildContext());
      }

      if (!isNew && c.getSnapshotBeforeUpdate != null) {
        snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
      }

      let isTopLevelFragment =
        tmp != null && tmp.type === Fragment && tmp.key == null;
      let renderResult = isTopLevelFragment ? tmp.props.children : tmp;

      diffChildren(
        parentDom,
        Array.isArray(renderResult) ? renderResult : [renderResult],
        newVNode,
        oldVNode,
        globalContext,
        isSvg,
        excessDomChildren,
        commitQueue,
        oldDom,
        isHydrating
      );

      c.base = newVNode._dom;

      // We successfully rendered this VNode, unset any stored hydration/bailout state:
      newVNode._hydrating = null;

      if (c._renderCallbacks.length) {
        commitQueue.push(c);
      }

      if (clearProcessingException) {
        c._pendingError = c._processingException = null;
      }

      c._force = false;
    } else if (
      excessDomChildren == null &&
      newVNode._original === oldVNode._original
    ) {
      newVNode._children = oldVNode._children;
      newVNode._dom = oldVNode._dom;
    } else {
      newVNode._dom = diffElementNodes(
        oldVNode._dom,
        newVNode,
        oldVNode,
        globalContext,
        isSvg,
        excessDomChildren,
        commitQueue,
        isHydrating
      );
    }

    if ((tmp = options.diffed)) {
      tmp(newVNode);
    }
  } catch (e) {
    newVNode._original = null;
    // if hydrating or creating initial tree, bailout preserves DOM:
    if (isHydrating || excessDomChildren != null) {
      newVNode._dom = oldDom;
      newVNode._hydrating = !!isHydrating;
      excessDomChildren[excessDomChildren.indexOf(oldDom)] = null;
      // ^ could possibly be simplified to:
      // excessDomChildren.length = 0;
    }
    options._catchError(e, newVNode, oldVNode);
  }
}

/**
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').VNode} root
 */
function commitRoot(commitQueue, root) {
  if (options._commit) {
    options._commit(root, commitQueue);
  }

  commitQueue.some(c => {
    try {
      // @ts-ignore Reuse the commitQueue variable here so the type changes
      commitQueue = c._renderCallbacks;
      c._renderCallbacks = [];
      commitQueue.some(cb => {
        // @ts-ignore See above ts-ignore on commitQueue
        cb.call(c);
      });
    } catch (e) {
      options._catchError(e, c._vnode);
    }
  });
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {*} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @returns {import('../internal').PreactElement}
 */
function diffElementNodes(
  dom,
  newVNode,
  oldVNode,
  globalContext,
  isSvg,
  excessDomChildren,
  commitQueue,
  isHydrating
) {
  let oldProps = oldVNode.props;
  let newProps = newVNode.props;
  let nodeType = newVNode.type;
  let i = 0;

  // Tracks entering and exiting SVG namespace when descending through the tree.
  if (nodeType === 'svg') {
    isSvg = true;
  }

  if (excessDomChildren != null) {
    for (; i < excessDomChildren.length; i++) {
      const child = excessDomChildren[i];

      // if newVNode matches an element in excessDomChildren or the `dom`
      // argument matches an element in excessDomChildren, remove it from
      // excessDomChildren so it isn't later removed in diffChildren
      if (
        child &&
        'setAttribute' in child === !!nodeType &&
        (nodeType ? child.localName === nodeType : child.nodeType === 3)
      ) {
        dom = child;
        excessDomChildren[i] = null;
        break;
      }
    }
  }

  if (dom == null) {
    if (nodeType === null) {
      // @ts-ignore createTextNode returns Text, we expect PreactElement
      return document.createTextNode(newProps);
    }

    if (isSvg) {
      dom = document.createElementNS(
        'http://www.w3.org/2000/svg',
        // @ts-ignore We know `newVNode.type` is a string
        nodeType
      );
    } else {
      dom = document.createElement(
        // @ts-ignore We know `newVNode.type` is a string
        nodeType,
        newProps.is && newProps
      );
    }

    // we created a new parent, so none of the previously attached children can be reused:
    excessDomChildren = null;
    // we are creating a new node, so we can assume this is a new subtree (in case we are hydrating), this deopts the hydrate
    isHydrating = false;
  }

  if (nodeType === null) {
    // During hydration, we still have to split merged text from SSR'd HTML.
    if (oldProps !== newProps && (!isHydrating || dom.data !== newProps)) {
      dom.data = newProps;
    }
  } else {
    // If excessDomChildren was not null, repopulate it with the current element's children:
    excessDomChildren = excessDomChildren && slice.call(dom.childNodes);

    oldProps = oldVNode.props || EMPTY_OBJ;

    let oldHtml = oldProps.dangerouslySetInnerHTML;
    let newHtml = newProps.dangerouslySetInnerHTML;

    // During hydration, props are not diffed at all (including dangerouslySetInnerHTML)
    // @TODO we should warn in debug mode when props don't match here.
    if (!isHydrating) {
      // But, if we are in a situation where we are using existing DOM (e.g. replaceNode)
      // we should read the existing DOM attributes to diff them
      if (excessDomChildren != null) {
        oldProps = {};
        for (i = 0; i < dom.attributes.length; i++) {
          oldProps[dom.attributes[i].name] = dom.attributes[i].value;
        }
      }

      if (newHtml || oldHtml) {
        // Avoid re-applying the same '__html' if it did not changed between re-render
        if (
          !newHtml ||
          ((!oldHtml || newHtml.__html != oldHtml.__html) &&
            newHtml.__html !== dom.innerHTML)
        ) {
          dom.innerHTML = (newHtml && newHtml.__html) || '';
        }
      }
    }

    diffProps(dom, newProps, oldProps, isSvg, isHydrating);

    // If the new vnode didn't have dangerouslySetInnerHTML, diff its children
    if (newHtml) {
      newVNode._children = [];
    } else {
      i = newVNode.props.children;
      diffChildren(
        dom,
        Array.isArray(i) ? i : [i],
        newVNode,
        oldVNode,
        globalContext,
        isSvg && nodeType !== 'foreignObject',
        excessDomChildren,
        commitQueue,
        excessDomChildren
          ? excessDomChildren[0]
          : oldVNode._children && getDomSibling(oldVNode, 0),
        isHydrating
      );

      // Remove children that are not part of any vnode.
      if (excessDomChildren != null) {
        for (i = excessDomChildren.length; i--;) {
          if (excessDomChildren[i] != null) {
            removeNode(excessDomChildren[i]);
          }
        }
      }
    }

    // (as above, don't diff props during hydration)
    if (!isHydrating) {
      if (
        'value' in newProps &&
        (i = newProps.value) !== undefined &&
        // #2756 For the <progress>-element the initial value is 0,
        // despite the attribute not being present. When the attribute
        // is missing the progress bar is treated as indeterminate.
        // To fix that we'll always update it when it is 0 for progress elements
        (i !== oldProps.value ||
          i !== dom.value ||
          (nodeType === 'progress' && !i))
      ) {
        setProperty(dom, 'value', i, oldProps.value, false);
      }
      if (
        'checked' in newProps &&
        (i = newProps.checked) !== undefined &&
        i !== dom.checked
      ) {
        setProperty(dom, 'checked', i, oldProps.checked, false);
      }
    }
  }

  return dom;
}

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 * @param {object|function} ref
 * @param {any} value
 * @param {import('../internal').VNode} vnode
 */
function applyRef(ref, value, vnode) {
  try {
    if (typeof ref == 'function') {
      ref(value);
    } else {
      ref.current = value;
    }
  } catch (e) {
    options._catchError(e, vnode);
  }
}

/**
 * Unmount a virtual node from the tree and apply DOM changes
 * @param {import('../internal').VNode} vnode The virtual node to unmount
 * @param {import('../internal').VNode} parentVNode The parent of the VNode that
 * initiated the unmount
 * @param {boolean} [skipRemove] Flag that indicates that a parent node of the
 * current element is already detached from the DOM.
 */
function unmount(vnode, parentVNode, skipRemove) {
  let r;
  if (options.unmount) {
    options.unmount(vnode);
  }

  if ((r = vnode.ref)) {
    if (!r.current || r.current === vnode._dom) {
      applyRef(r, null, parentVNode);
    }
  }

  if ((r = vnode._component) != null) {
    if (r.componentWillUnmount) {
      try {
        r.componentWillUnmount();
      } catch (e) {
        options._catchError(e, parentVNode);
      }
    }

    r.base = r._parentDom = null;
  }

  if ((r = vnode._children)) {
    for (let i = 0; i < r.length; i++) {
      if (r[i]) {
        unmount(r[i], parentVNode, typeof vnode.type != 'function');
      }
    }
  }

  if (!skipRemove && vnode._dom != null) {
    removeNode(vnode._dom);
  }

  // Must be set to `undefined` to properly clean up `_nextDom`
  // for which `null` is a valid value. See comment in `create-element.js`
  vnode._dom = vnode._nextDom = undefined;
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
  return this.constructor(props, context);
}

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./internal').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 * @param {import('./internal').PreactElement | object} [replaceNode] Optional: Attempt to re-use an
 * existing DOM tree rooted at `replaceNode`
 */
function render(vnode, parentDom, replaceNode) {
  if (options._root) {
    options._root(vnode, parentDom);
  }

  // We abuse the `replaceNode` parameter in `hydrate()` to signal if we are in
  // hydration mode or not by passing the `hydrate` function instead of a DOM
  // element..
  let isHydrating = typeof replaceNode === 'function';

  // To be able to support calling `render()` multiple times on the same
  // DOM node, we need to obtain a reference to the previous tree. We do
  // this by assigning a new `_children` property to DOM nodes which points
  // to the last rendered tree. By default this property is not present, which
  // means that we are mounting a new tree for the first time.
  let oldVNode = isHydrating
    ? null
    : (replaceNode && replaceNode._children) || parentDom._children;

  vnode = (
    (!isHydrating && replaceNode) ||
    parentDom
  )._children = createElement(Fragment, null, [vnode]);

  // List of effects that need to be called after diffing.
  let commitQueue = [];
  diff(
    parentDom,
    // Determine the new vnode tree and store it on the DOM element on
    // our custom `_children` property.
    vnode,
    oldVNode || EMPTY_OBJ,
    EMPTY_OBJ,
    parentDom.ownerSVGElement !== undefined,
    !isHydrating && replaceNode
      ? [replaceNode]
      : oldVNode
        ? null
        : parentDom.firstChild
          ? slice.call(parentDom.childNodes)
          : null,
    commitQueue,
    !isHydrating && replaceNode
      ? replaceNode
      : oldVNode
        ? oldVNode._dom
        : parentDom.firstChild,
    isHydrating
  );

  // Flush all queued effects
  commitRoot(commitQueue, vnode);
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 * @param {import('./internal').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * update
 */
function hydrate(vnode, parentDom) {
  render(vnode, parentDom, hydrate);
}

/**
 * Clones the given VNode, optionally adding attributes/props and replacing its children.
 * @param {import('./internal').VNode} vnode The virtual DOM element to clone
 * @param {object} props Attributes/props to add when cloning
 * @param {Array<import('./internal').ComponentChildren>} rest Any additional arguments will be used as replacement children.
 * @returns {import('./internal').VNode}
 */
function cloneElement(vnode, props, children) {
  let normalizedProps = assign({}, vnode.props),
    key,
    ref,
    i;
  for (i in props) {
    if (i == 'key') {
      key = props[i];
    } else if (i == 'ref') {
      ref = props[i];
    } else {
      normalizedProps[i] = props[i];
    }
  }

  if (arguments.length > 2) {
    normalizedProps.children =
      arguments.length > 3 ? slice.call(arguments, 2) : children;
  }

  return createVNode(
    vnode.type,
    normalizedProps,
    key || vnode.key,
    ref || vnode.ref,
    null
  );
}

let i = 0;

function createContext(defaultValue, contextId) {
  contextId = '__cC' + i++;

  const context = {
    _id: contextId,
    _defaultValue: defaultValue,
    /** @type {import('./internal').FunctionComponent} */
    Consumer(props, contextValue) {
      // return props.children(
      // 	context[contextId] ? context[contextId].props.value : defaultValue
      // );
      return props.children(contextValue);
    },
    /** @type {import('./internal').FunctionComponent} */
    Provider(props) {
      if (!this.getChildContext) {
        let subs = [];
        let ctx = {};
        ctx[contextId] = this;

        this.getChildContext = () => ctx;

        this.shouldComponentUpdate = function (_props) {
          if (this.props.value !== _props.value) {
            // I think the forced value propagation here was only needed when `options.debounceRendering` was being bypassed:
            // https://github.com/preactjs/preact/commit/4d339fb803bea09e9f198abf38ca1bf8ea4b7771#diff-54682ce380935a717e41b8bfc54737f6R358
            // In those cases though, even with the value corrected, we're double-rendering all nodes.
            // It might be better to just tell folks not to use force-sync mode.
            // Currently, using `useContext()` in a class component will overwrite its `this.context` value.
            // subs.some(c => {
            // 	c.context = _props.value;
            // 	enqueueRender(c);
            // });

            // subs.some(c => {
            // 	c.context[contextId] = _props.value;
            // 	enqueueRender(c);
            // });
            subs.some(enqueueRender);
          }
        };

        this.sub = c => {
          subs.push(c);
          let old = c.componentWillUnmount;
          c.componentWillUnmount = () => {
            subs.splice(subs.indexOf(c), 1);
            if (old) {
              old.call(c);
            }
          };
        };
      }

      return props.children;
    }
  };

  // Devtools needs access to the context object when it
  // encounters a Provider. This is necessary to support
  // setting `displayName` on the context object instead
  // of on the component itself. See:
  // https://reactjs.org/docs/context.html#contextdisplayname

  return (context.Provider._contextRef = context.Consumer.contextType = context);
}

export {
  render,
  hydrate,
  createElement,
  createElement as h,
  Fragment,
  createRef,
  isValidElement,
  Component,
  cloneElement,
  createContext,
  toChildArray,
  options
};
