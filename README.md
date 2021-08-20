⚠️ This extension is deprecated and is compatible only with the jsreport v2
--

# jsreport-weasyprint-pdf

jsreport recipe using [WeasyPrint](http://weasyprint.org/) utility to convert html to pdf. This recipe solves the same task as [phantom-pdf](https://jsreport.net/learn/phantom-pdf), [wkhtmltopdf](https://jsreport.net/learn/wkhtmltopdf) or [electron-pdf](https://github.com/bjrmatos/jsreport-electron-pdf). However it has the best support for defining printing layout using [css @page rule](https://developer.mozilla.org/en/docs/Web/CSS/@page).

![weasyprint](https://jsreport.net/screenshots/weasyprint.png)
 
## Installation

You can run the whole jsreport with already installed recipe using single command:

```sh
docker run -p 5488:5488 jsreport/jsreport-weasyprint-pdf
```

Or you can follow these steps to install [WeasyPrint](http://weasyprint.org/) recipe

1. jsreport application folder
2. `npm install jsreport-weasyprint-pdf`
3. install [WeasyPrint](http://weasyprint.org/)

## Development

```
git clone https://github.com/jsreport/jsreport-weasyprint-pdf.git
cd jsreport-weasyprint-pdf
npm install
npm run docker
```
