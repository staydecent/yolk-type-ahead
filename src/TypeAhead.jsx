import {h, render} from 'yolk'
import {BehaviorSubject} from 'rxjs/BehaviorSubject' 

import 'rxjs/add/operator/filter'
import 'rxjs/add/operator/merge'
import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/startWith'
import 'rxjs/add/operator/withLatestFrom'

export default TypeAhead


const DEFAULT_POS = 0
const KEY = {
  UP: 38,
  DOWN: 40,
  ENTER: 13,
  ESC: 27
}
const KEY_VALUES = [KEY.UP, KEY.DOWN, KEY.ENTER, KEY.ESC]

function TypeAhead({props, createEventHandler}) {
  props = setDefaultProps(props)

  const handleKeyUp = createEventHandler(ev => ev.keyCode)
  const handleInput = createEventHandler(ev => ev.target.value)
  const displayValue = new BehaviorSubject('')

  handleInput.subscribe(displayValue)

  handleKeyUp
    
    // One of our `KEYS` was pressed
    .filter(keyCode => KEY_VALUES.indexOf(keyCode) > -1)
    
    // Combine `keyCode` with `displayValue` in an object
    .withLatestFrom(displayValue, (keyCode, val) => ({keyCode, val}))
    
    // Continue if the length of the user input is >= our threshold
    .filter(({val}) => val && val.length >= props.threshold)
    
    // Ok, do stuff depending on the `keyCode`
    .subscribe(({keyCode, val}) => {
      switch (keyCode) {
        case KEY.UP:
          if (props.currPos > 0) {
            props.currPos--
          }
          break
        case KEY.DOWN:
          let max = props.suggestions.length - 1
          if (props.currPos < max || props.currPos === DEFAULT_POS) {
            props.currPos++
          }
          break
        case KEY.ENTER:
          console.debug('handleSelection', props.suggestions[props.currPos] || val)
          break
        case KEY.ESC:
          props.showSuggestions = false
      }
    })

  let classes = ['type-ahead-holder'];
  if (props.showSuggestions) {
    classes.push('type-ahead-suggestions-visible')
  } 

  return (
    <div className={classes}>
      <input 
        placeholder={props.placeholder} 
        // value={displayValue}
        onInput={handleInput}
        onKeyUp={handleKeyUp}
        //ng-blur="props.onBlur()" 
        className="type-ahead-input" />

      <ul className="type-ahead-list">
      </ul>
    </div> 
  )


}

function setDefaultProps(props) {
  props.currPos = props.currPos || DEFAULT_POS
  props.suggestions = props.suggestions || []
  props.showSuggestions = props.showSuggestions || false
  props.threshold = props.threshold || 2
  props.limit = props.limit || Infinity
  props.delay = props.delay || 100
  return props
}
