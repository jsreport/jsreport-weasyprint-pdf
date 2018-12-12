const uuid = require('uuid').v1
const path = require('path')
const fs = require('fs')
const childProcess = require('child_process')
const Promise = require('bluebird')
const writeFileAsync = Promise.promisify(fs.writeFile)
const Phantom = require('phantom-workers')
let phantom

function evaluateJavaScript (reporter, definition, html, req, res) {
  if (req.template.weasyprint && typeof req.template.weasyprint.evaluateJavaScript !== 'undefined' && JSON.parse(req.template.weasyprint.evaluateJavaScript) === false) {
    return
  }

  var weasyprint = Object.assign({
    htmlPath: html,
    allowLocalFilesAccess: definition.options.hasOwnProperty('allowLocalFilesAccess') ? definition.options.allowLocalFilesAccess : false
  }, req.template.weasyprint || {})

  if (weasyprint.waitForJS) {
    weasyprint.waitForJS = JSON.parse(weasyprint.waitForJS)
  }

  return phantom.executeAsync(weasyprint).then((phres) => {
    if (phres.isError) {
      var error = new Error(phres.message)
      error.stack = phres.stack
      throw error
    }

    phres.logs.forEach((m) => {
      reporter.logger[m.level](m.message, { timestamp: m.timestamp, ...req })
    })
  })
}

function convert (reporter, definition, req, res) {
  const id = uuid()
  const html = path.join(reporter.options.tempDirectory, id + '.html')
  const pdf = path.join(reporter.options.tempDirectory, id + '.pdf')

  return writeFileAsync(html, res.content.toString()).then(() => {
    return evaluateJavaScript(reporter, definition, html, req, res)
  }).then(() => {
    return new Promise((resolve, reject) => {
      const parameters = ['file:///' + html, pdf]

      reporter.logger.debug(`weasyprint ${parameters.join(' ')}`, req)

      childProcess.execFile('weasyprint', parameters, (err, stderr, stdout) => {
        const logMsg = (err || '') + (stderr || '') + (stdout || '')

        if (logMsg !== '') {
          reporter.logger.debug(logMsg, req)
        }

        if (err) {
          return reject(err)
        }

        fs.readFile(pdf, (err, buf) => {
          if (err) {
            return reject(err)
          }

          res.meta.contentType = 'application/pdf'
          res.meta.fileExtension = 'pdf'
          res.content = buf

          resolve(res)
        })
      })
    })
  })
}

module.exports = function (reporter, definition) {
  if (!Object.getOwnPropertyNames(definition.options).length) {
    definition.options = reporter.options.phantom || {}
  }

  reporter.extensionsManager.recipes.push({
    name: 'weasyprint-pdf',
    execute: (req, res) => {
      return convert(reporter, definition, req, res)
    }
  })

  reporter.documentStore.registerComplexType('weasyprintType', {
    evaluateJavaScript: { type: 'Edm.Boolean' },
    waitForJS: { type: 'Edm.Boolean' }
  })

  if (reporter.documentStore.model.entityTypes['TemplateType']) {
    reporter.documentStore.model.entityTypes['TemplateType'].weasyprint = { type: 'jsreport.weasyprintType' }
  }

  phantom = Phantom(Object.assign({}, reporter.options.phantom || {}, {
    pathToPhantomScript: path.join(__dirname, 'phantomScript.js')
  }))

  Promise.promisifyAll(phantom)

  return phantom.startAsync()
}
