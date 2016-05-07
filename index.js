var fs = require('fs')
var async = require('async')
var path = require('path')
var util = require('util')
var cloneDeep = require('lodash.clonedeep')
var uniq = require('lodash.uniq')
var minimatch = require('minimatch')
var debug = require('debug')('file-index')
var defaultHandlers

module.exports.scan = function(aPath, filters, callback) {
	debug('scan(%s)', aPath)

	if (typeof filters === 'function') {
		callback = filters
		filters = ['*']
	}

	// TODO this module code is not separated/modular enough - its tailored around loading and handling file content
	// this is a "hack" to write less code for scanning
	function toStatHandler(file, stat, callback) {
		callback(null, stat)
	}

	var handlers = []

	if (!util.isArray(filters)) {
		filters = [ filters ]
	}

	for (var i = 0; i < filters.length; i++) {
		module.exports.handle(filters[i], toStatHandler, handlers)
	}
	// end hack

	return module.exports.load(aPath, handlers, callback)
}

module.exports.load = function(aPath, loadHandlers, externalCallback) {

	debug('load(%s, %s)', aPath)

	if (typeof loadHandlers === 'function') {
		externalCallback = loadHandlers
		loadHandlers = defaultHandlers
	}

	var internalLoadHandlers = cloneDeep(loadHandlers)

	if (util.isArray(aPath)) {
		debug('loading from various paths')
		aPath = uniq(aPath)

		var results = {}

		async.each(aPath, function(p, cb) {
			module.exports.loadOne(p, results, internalLoadHandlers, cb)
		}, function(err, __) {
			if (err) {
				return externalCallback(err)
			}

			externalCallback(null, results)
		})

	} else if (typeof (aPath) === 'string') {
		debug('loading from a single path')
		module.exports.loadOne(aPath, {}, internalLoadHandlers, externalCallback)
	} else {
		throw new Error('invalid path: ' + aPath)
	}
}

module.exports.loadOne = function(aPath, results, loadHandlers, callback) {
	debug('loadOne(%s)', aPath)

	module.exports.statAndAct(aPath, results, loadHandlers, function(err) {
		if (err) {
			return callback(err)
		}

		callback(null, results)
	})
}

// TODO can optimize a lot if there is only one handler, especially if its '*'
module.exports.statAndAct = function(aPath, results, loadHandlers, callback) {
	debug('statAndAct(%s)', aPath, callback.from)

	fs.stat(aPath, function(err, stat) {
		var dirname = path.dirname(aPath)

		if (err) {
			return callback(err)
		}

		if (stat.isFile()) {

			var handler
			for (var i = 0; i < loadHandlers.length; i++) {

				var pat = loadHandlers[i].pattern

				if (minimatch(aPath, path.join(dirname, pat))) {
					handler = loadHandlers[i].handler
					break
				}
			}

			function internalLoadCallback(err, data) {
				if (err) {
					debug(err.cause, callback.from)
					return callback(err)
				}

				results[aPath] = data
				callback()
			}

			if (typeof(handler) === 'function') {
				handler(aPath, stat, internalLoadCallback)
			} else {
				callback()
			}

		} else if (stat.isDirectory()) {
			module.exports.scanDir(aPath, results, loadHandlers, callback)
		}
	})
}

module.exports.scanDir = function(aPath, results, loadHandlers, callback) {
	debug('scanDir(%s)', aPath)

	fs.readdir(aPath, function(err, files) {
		async.each(files, function(file, _callback) {
			_callback.from='scandir'
			module.exports.statAndAct(path.join(aPath, file), results, loadHandlers, _callback)
		}, callback)
	})
}

module.exports.handle = function (pat, handler, handlers) {
	debug('handle(%s)', pat)
	handlers = handlers || []

	handlers.push({ pattern: pat, handler: handler })

	return {
		handle: function(_pat, _handler) {
			return module.exports.handle(_pat, _handler, handlers)
		},
		create: function() {
			return handlers
		}
	}
}

module.exports.loadRawFile = function(file, stat, callback) {
	debug('loadRawFile(%s)', file)
	fs.readFile(file, function (err, data) {
		if (err) {
			return callback(err)
		}

		callback(null, data)
	})
}

module.exports.loadRawUtf8File = function(file, stat, callback) {
	debug('loadRawUtf8File(%s)', file)
	fs.readFile(file, 'utf8', function (err, data) {
		if (err) {
			return callback(err)
		}

		callback(null, data)
	})
}

module.exports.loadJsonFile = function(file, stat, callback) {
	debug('loadJsonFile(%s)', file)
	fs.readFile(file, function (err, data) {
		if (err) {
			return callback(err)
		}

		var error, result

		try {
			result = JSON.parse(data)
		} catch (e) {
			error = new Error('failed to parse file')
			error.cause = e
			error.file = file
		}

		callback(error, result)
	})
}

defaultHandlers = [
	{ pattern: '*.json', handler: module.exports.loadJsonFile },
	{ pattern: '*', handler: module.exports.loadRawUtf8File }
]