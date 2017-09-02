import Properties from './Properties.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent('weasyprint pdf', Properties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'weasyprint-pdf')
