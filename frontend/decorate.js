/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */
'use strict';

var React = require('react');

type Options = {
  /** A function determining whether the component should rerender when the
   * parent rerenders. Defaults to function returning false **/
  shouldUpdate?: (nextProps: Object, props: Object) => boolean,
  /** A function returning a list of events to listen to **/
  listeners?: (props: Object, store: Object) => Array<string>,
  /** This is how you get data and action handlers from the store. The
   * returned object will be spread in as props on the wrapped component. **/
  props: (store: Object, props: Object) => Object,
};

/**
 * This Higher Order Component decorator function is the way the components
 * communicate with the central Store.
 *
 * Example:
 *
 * class MyComp {
 *   render() {
 *     return (
 *       <div>
 *         Hello {this.props.name}.
 *         <button onClick={this.props.sayHi}>Hi back</button>
 *       </div>
 *     );
 *   }
 * }
 *
 * module.exports = decorate({
 *   listeners: () => ['nameChanged'],
 *   props(store) {
 *     return {
 *       name: store.name,
 *       sayHi: () => store.sayHi(),
 *     };
 *   },
 * }, MyComp);
 */
module.exports = function(options: Options, Component: any): any {
  var storeKey = options.store || 'store';
  class Wrapper extends React.Component {
    _listeners: Array<string>;
    _update: () => void;

    constructor(props) {
      super(props);
      this.state = {};
    }

    componentWillMount() {
      if (!this.context[storeKey]) {
        return console.warn('no store on context...');
      }
      this._update = () => this.forceUpdate();
      if (!options.listeners) {
        return undefined;
      }
      this._listeners = options.listeners(this.props, this.context[storeKey]);
      this._listeners.forEach(evt => {
        this.context[storeKey].on(evt, this._update);
      });
    }

    componentWillUnmount() {
      if (!this.context[storeKey]) {
        return console.warn('no store on context...');
      }
      this._listeners.forEach(evt => {
        this.context[storeKey].off(evt, this._update);
      });
    }

    shouldComponentUpdate(nextProps, nextState) {
      if (nextState !== this.state) {
        return true;
      }
      if (options.shouldUpdate) {
        return options.shouldUpdate(nextProps, this.props);
      }
      return false;
    }

    componentWillUpdate(nextProps, nextState) {
      if (!this.context[storeKey]) {
        return console.warn('no store on context...');
      }
      if (!options.listeners) {
        return undefined;
      }
      var listeners = options.listeners(this.props, this.context[storeKey]);
      var diff = arrayDiff(listeners, this._listeners);
      diff.missing.forEach(name => {
        this.context[storeKey].off(name, this._update);
      });
      diff.newItems.forEach(name => {
        this.context[storeKey].on(name, this._update);
      });
      this._listeners = listeners;
    }

    render() {
      var store = this.context[storeKey];
      var props = store && options.props(store, this.props);
      return <Component {...props} {...this.props} />;
    }
  }

  Wrapper.contextTypes = {
    // $FlowFixMe computed property
    [storeKey]: React.PropTypes.object,
  };

  Wrapper.displayName = 'Wrapper(' + Component.name + ')';

  return Wrapper;
};

function arrayDiff(array, oldArray) {
  var names = new Set();
  var missing = [];
  for (var i = 0; i < array.length; i++) {
    names.add(array[i]);
  }
  for (var j = 0; j < oldArray.length; j++) {
    if (!names.has(oldArray[j])) {
      missing.push(oldArray[j]);
    } else {
      names.delete(oldArray[j]);
    }
  }
  return {
    missing,
    newItems: setToArray(names),
  };
}

function setToArray(set) {
  var res = [];
  for (var val of set) {
    res.push(val);
  }
  return res;
}
