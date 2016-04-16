import {h, render} from 'yolk'
import {BehaviorSubject} from 'rxjs/BehaviorSubject'
import check from 'check-arg-types'

import TypeAhead from './TypeAhead.jsx'


const search = new BehaviorSubject('')
search
  .filter(val => check.prototype.toType(val) === 'string')
  .subscribe(str => search.next(['array', 'of', 'string', 'results']))

render(
  <TypeAhead title="TypeAhead" search={search}>Type ahead my good friend</TypeAhead>,
  document.getElementById('container')
)