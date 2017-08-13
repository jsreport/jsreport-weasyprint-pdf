var uuid = require('uuid').v1
var path = require('path')
var fs = require('fs')
var objectAssign = require('object-assign')
var childProcess = require('child_process')
var Promise = require('bluebird')
var writeFileAsync = Promise.promisify(fs.writeFile)
var Phantom = require('phantom-workers')
var phantom

function evaluateJavaScript (reporter, definition, html, req, res) {
  if (req.template.weasyprint && typeof req.template.weasyprint.evaluateJavaScript !== 'undefined' && JSON.parse(req.template.weasyprint.evaluateJavaScript) === false) {
    return
  }

  var weasyprint = objectAssign({
    htmlPath: html,
    allowLocalFilesAccess: definition.options.hasOwnProperty('allowLocalFilesAccess') ? definition.options.allowLocalFilesAccess : false
  }, req.template.weasyprint || {})

  if (weasyprint.waitForJS) {
    weasyprint.waitForJS = JSON.parse(weasyprint.waitForJS)
  }

  return phantom.executeAsync(weasyprint).then(function (phres) {
    if (phres.isError) {
      var error = new Error(phres.message)
      error.stack = phres.stack
      throw error
    }

    phres.logs.forEach(function (m) {
      req.logger[m.level](m.message, { timestamp: m.timestamp })
    })
  })
}

function convert (reporter, definition, req, res) {
  var id = uuid()
  var html = path.join(reporter.options.tempDirectory, id + '.html')
  var pdf = path.join(reporter.options.tempDirectory, id + '.pdf')

  return writeFileAsync(html, res.content.toString()).then(function () {
    return evaluateJavaScript(reporter, definition, html, req, res)
  }).then(function () {
    return new Promise(function (resolve, reject) {
      var parameters = ['file:///' + html, pdf]

      req.logger.debug('weasyprint  ' + parameters.join(' '))

      childProcess.execFile('weasyprint', parameters, function (err, stderr, stdout) {
        req.logger.debug((err || '') + (stderr || '') + (stdout || ''))

        if (err) {
          return reject(err)
        }

        fs.readFile(pdf, function (err, buf) {
          if (err) {
            return reject(err)
          }

          res.headers['Content-Type'] = 'application/pdf'
          res.headers['Content-Disposition'] = 'inline; filename="report.pdf"'
          res.headers['File-Extension'] = 'pdf'
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
    name: 'weasyprint',
    execute: function (req, res) {
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

  phantom = Phantom(objectAssign({}, reporter.options.phantom || {}, {
    pathToPhantomScript: path.join(__dirname, 'phantomScript.js')
  }))
  Promise.promisifyAll(phantom)

  return phantom.startAsync()
}
