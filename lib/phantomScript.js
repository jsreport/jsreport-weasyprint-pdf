var system = require('system')
var webpage = require('webpage')
var webserver = require('webserver')
var port = system.env['PHANTOM_WORKER_PORT']
var host = system.env['PHANTOM_WORKER_HOST']
var maxLogEntrySize = system.env['PHANTON_MAX_LOG_ENTRY_SIZE']
var fs = require('fs')

webserver.create().listen(host + ':' + port, function (req, res) {
  var messages = []

  function trimMessage (pars) {
    var message = Array.prototype.join.call(pars, ' ')

    // this is special case, because phantom logs base64 images content completely into the output
    if (message.indexOf('Request data:image') === 0 && message.length > 100) {
      return message.substring(0, 100) + '...'
    }

    if (message.length > maxLogEntrySize) {
      return message.substring(0, maxLogEntrySize) + '...'
    }

    return message
  };

  console.log = function (m) {
    messages.push({ timestamp: new Date().getTime(), message: trimMessage(arguments), level: 'debug' })
  }

  console.error = function (m) {
    messages.push({ timestamp: new Date().getTime(), message: trimMessage(arguments), level: 'error' })
  }
  console.warn = function (m) {
    messages.push({ timestamp: new Date().getTime(), message: trimMessage(arguments), level: 'warn' })
  }

  var page = webpage.create()
  var body = JSON.parse(req.post)
  var pageJSisDone = !body.waitForJS

  page.onResourceRequested = function (request, networkRequest) {
    console.log('Request ' + request.url)
    if (request.url.lastIndexOf('file:///' + body.htmlPath, 0) === 0) {
      return
    }

    // potentially dangerous request
    if (request.url.lastIndexOf('file:///', 0) === 0 && !body.allowLocalFilesAccess) {
      console.log('Aborting request to local file')
      networkRequest.abort()
      return
    }

    // to support cdn like format //cdn.jquery...
    if (request.url.lastIndexOf('file://', 0) === 0 && request.url.lastIndexOf('file:///', 0) !== 0) {
      networkRequest.changeUrl(request.url.replace('file://', 'http://'))
    }

    if (body.waitForJS && request.url.lastIndexOf('http://intruct-javascript-ending', 0) === 0) {
      pageJSisDone = true
    }
  }

  page.onConsoleMessage = function (msg, line, source) {
    console.log(msg, line, source)
  }

  page.onResourceError = function (resourceError) {
    console.warn('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')')
    console.warn('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString)
  }

  page.onError = function (msg, trace) {
    console.warn(msg)
    trace.forEach(function (item) {
      console.warn('  ', item.file, ':', item.line)
    })
  }

  page.onInitialized = function () {
    page.evaluate(function (varName) {
      Object.defineProperty(window, varName, {
        set: function (val) {
          if (!val) { return }

          if (val === true) {
            var scriptNode = document.createElement('script')
            scriptNode.src = 'http://intruct-javascript-ending'
            document.body.appendChild(scriptNode)
          }
        },
        get: function () {

        }
      })
    }, 'JSREPORT_READY_TO_START')
  }

  page.open('file:///' + body.htmlPath, function (status) {
    try {
      var resolvePage = function () {
        if (!pageJSisDone) {
          return setTimeout(function () {
            resolvePage()
          }, 100)
        }

        page.evaluate(function () {
          var list = document.getElementsByTagName('canvas')
          for (var i = 0; list[i]; i++) {
            var canvas = list[i]
            var img = new Image()
            img.src = canvas.toDataURL()

            for (var j = 0; j < canvas.attributes.length; j++) {
              var attr = canvas.attributes.item(j)
              img.setAttribute(attr.nodeName, attr.nodeValue)
            }

            canvas.parentNode.replaceChild(img, canvas)
          }
        })

        fs.write(body.htmlPath, page.content, 'w')
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.write(JSON.stringify({ logs: messages }))
        res.close()
      }

      resolvePage()
    } catch (e) {
      console.error(e.message)
      res.statusCode = 500
      var ee = new Error(e.message + '; log:' + JSON.stringify(messages))
      ee.isError = true

      res.write(JSON.stringify(ee))
      res.close()
    }
  })
})
