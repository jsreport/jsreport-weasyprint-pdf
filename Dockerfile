FROM jsreport/jsreport:1.8.1
MAINTAINER Jan Blaha
EXPOSE 5488

RUN apt-get update && \
    apt-get install -y build-essential python3-dev python3-pip python3-cffi libcairo2 libpango1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info && \
    pip3 install --upgrade pip && \
    rm -rf /tmp/* /var/lib/apt/lists/* /var/cache/apt/*

RUN pip3 install WeasyPrint 

RUN npm install jsreport-weasyprint && \
    npm cache clean -f

CMD ["bash", "/usr/src/app/run.sh"]