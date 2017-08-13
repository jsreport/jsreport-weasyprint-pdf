import Properties from './Properties.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent('weasyprint', Properties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'weasyprint')
