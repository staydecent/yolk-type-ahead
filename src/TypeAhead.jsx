import check from 'check-arg-types'
import {h, render} from 'yolk'
import {BehaviorSubject} from 'rxjs/BehaviorSubject' 

import 'rxjs/add/operator/filter'
import 'rxjs/add/operator/merge'
import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/startWith'
import 'rxjs/add/operator/withLatestFrom'

export default TypeAhead


const INITIAL_POS = 0
const KEY = {
  UP: 38,
  DOWN: 40,
  ENTER: 13,
  ESC: 27
}
const KEY_VALUES = [KEY.UP, KEY.DOWN, KEY.ENTER, KEY.ESC]

function TypeAhead({props, createEventHandler}) {
  props = setDefaultProps(props)

  if (!props.search) {
    throw new Error('You need to provide a search function')
  }

  // Setup our events and streams
  // ----

  const handleInput = createEventHandler(ev => ev.target.value)  
  const displayValue = new BehaviorSubject('')
  handleInput.subscribe(displayValue) // displayValue === ev.target.value
  handleInput
    .filter(val => val && val.length >= props.threshold)
    .subscribe(getSearchResults)

  const handleKeyUp = createEventHandler(ev => ev.keyCode)
  handleKeyUp
    
    // One of our `KEYS` was pressed
    .filter(keyCode => KEY_VALUES.indexOf(keyCode) > -1)
    
    // Combine `keyCode` with `displayValue` in an object
    .withLatestFrom(displayValue, (keyCode, val) => ({keyCode, val}))
    
    // Continue if the length of the user input is >= our threshold
    .filter(({val}) => val && val.length >= props.threshold)
    
    // Ok, do stuff depending on the `keyCode`
    .subscribe(handleKeyCodes)

  // Set any template data
  // ----

  let classes = ['type-ahead-holder'];
  if (props.showSuggestions) {
    classes.push('type-ahead-suggestions-visible')
  }

  const ListItem = (suggestion, index) => {
    let classes = ['type-ahead-list-item']
    if (index === props.currPos) {
      classes.push('active')
    }
    return <li className={classes}>{suggestion}</li>
  }

  return (
    <div className={classes}>
      <h1>{props.title} ({props.suggestions.map(x => x.length)})</h1>
      <input 
        placeholder={props.placeholder} 
        value={displayValue}
        onInput={handleInput}
        onKeyUp={handleKeyUp}
        //ng-blur="props.onBlur()" 
        className="type-ahead-input" />

      <ul className="type-ahead-list">
        {props.suggestions.map(ListItem)}
      </ul>
    </div> 
  )

  function getSearchResults(val) {
    props.search.next(val)
    const sub = props.search
      .filter(val => check.prototype.toType(val) === 'array')
      .subscribe(results => {
        props.currPos = INITIAL_POS
        props.suggestions = results
        props.showSuggestions = results.length && val && val.length >= props.threshold
      })
    sub.unsubscribe()
  }

  function handleKeyCodes({keyCode, val}) {
    console.debug('handleKeyCodes', keyCode, val, props)
    switch (keyCode) {
      case KEY.UP:
        if (props.currPos > 0) {
          props.currPos--
        }
        break
      case KEY.DOWN:
        let max = props.suggestions.length - 1
        if (props.currPos < max || props.currPos === INITIAL_POS) {
          props.currPos++
        }
        break
      case KEY.ENTER:
        console.debug('handleSelection', props.suggestions[props.currPos] || val)
        break
      case KEY.ESC:
        props.showSuggestions = false
    }
  }
}

function setDefaultProps(props) {
  props.currPos = props.currPos || INITIAL_POS
  props.suggestions = props.suggestions || new BehaviorSubject([])
  props.showSuggestions = props.showSuggestions || false
  props.threshold = props.threshold || 2
  props.limit = props.limit || Infinity
  props.delay = props.delay || 100
  return props
}
