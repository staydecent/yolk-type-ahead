import {h, render} from 'yolk'

import 'rxjs/add/operator/merge'
import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/startWith'


function TypeAhead({props, children, createEventHandler}) {
  const title = props.title.map(title => `Awesome ${title}`)
  const handlePlus = createEventHandler(1)
  const handleMinus = createEventHandler(-1)
  const count = handlePlus
                .merge(handleMinus)
                .scan((x, y) => x + y)
                .startWith(0)

  return (
    <div>
      <h1>{title}</h1>
      <div>
        <button id="plus" onClick={handlePlus}>+</button>
        <button id="minus" onClick={handleMinus}>-</button>
      </div>
      <div>
        <span>Count: {count}</span>
      </div>
      {children}
    </div>
  )
}

render(
  <TypeAhead title="TypeAhead">Type ahead my good friend</TypeAhead>,
  document.getElementById('container')
)
