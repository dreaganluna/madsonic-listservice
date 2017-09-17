var winston = require('winston');
  var logger = function(logName, path) {
	  path = path || '/nodelogs';
	var logObject =  new (winston.Logger)({
    transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)({ filename: '/nodelogs/'+ logName +'.log', 'level': 'verbose', 'json': false ,handleExceptions: true,    humanReadableUnhandledException: true, maxsize: 5000000, maxFiles: 5, tailable: true})
    ]
  });

	logObject.remove(winston.transports.Console);
	logObject.add(winston.transports.Console, {'timestamp':true, 'level': 'verbose', 'colorize':true});
	return logObject;
  }


module.exports = logger;

