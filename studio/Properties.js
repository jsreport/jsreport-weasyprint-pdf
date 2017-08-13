import React, { Component } from 'react'

export default class Properties extends Component {
  render () {
    const { entity, onChange } = this.props
    const weasyprint = entity.weasyprint || {}

    const change = (change) => onChange(Object.assign({}, entity, { weasyprint: Object.assign({}, entity.weasyprint, change) }))

    return (
      <div className='properties-section'>
        <div className='form-group'><label>Evaluate JavaScript</label>
          <input
            type='checkbox' checked={weasyprint.evaluateJavaScript !== false}
            onChange={(v) => change({evaluateJavaScript: v.target.checked})} />
        </div>
        <div className='form-group'>
          <label title='window.JSREPORT_READY_TO_START=true;'>wait for printing trigger</label>
          <input
            type='checkbox' title='window.JSREPORT_READY_TO_START=true;' checked={weasyprint.waitForJS === true}
            onChange={(v) => change({ waitForJS: v.target.checked })} />
        </div>
      </div>
    )
  }
}
