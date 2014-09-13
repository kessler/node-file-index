var fs = require('fs')
var async = require('async')
var path = require('path')
var util = require('util')
var cloneDeep = require('lodash.clonedeep')
var minimatch = require('minimatch')

var defaultHandlers = [
	{ pattern: '*.json', handler: module.exports.loadJsonFile },
	{ pattern: '*', handler: module.exports.loadRawUtf8File }
]

module.exports.load = function(aPath, loadHandlers, externalCallback) {

	if (typeof loadHandlers === 'function') {
		externalCallback = loadHandlers
		loadHandlers = defaultHandlers
	}

	var internalLoadHandlers = cloneDeep(loadHandlers)

	if (util.isArray(aPath)) {
		var results = {}

		async.map(aPath, function(p, cb) {
			exports.loadOne(p, results, internalLoadHandlers, cb)
		}, function(err, _) {
			if (err) return externalCallback(err)

			externalCallback(null, results)
		})

	} else if (typeof (aPath) === 'string') {
		exports.loadOne(aPath, {}, internalLoadHandlers, externalCallback)
	} else {
		throw new Error('invalid path: ' + aPath)
	}
}

module.exports.loadOne = function(aPath, results, loadHandlers, callback) {
	exports.statAndAct(aPath, results, loadHandlers, function(err) {
		if (err)
			return callback(err)
		callback(null, results)
	})
}

module.exports.statAndAct = function(aPath, results, loadHandlers, callback) {
	fs.stat(aPath, function(err, stats) {

		if (err)
			return callback(err)

		if (stats.isFile()) {

			var handler

			for (var i = 0; i < loadHandlers.length; i++) {
				
				var pat = loadHandlers[i].pattern

				if (minimatch(aPath, path.join(path.dirname(aPath), pat))) {
					handler = loadHandlers[i].handler
					break
				}
			}
		
			function internalLoadCallback(err, data) {
				if (err) return callback(err)

				results[aPath] = data
				callback(null)
			}

			if (typeof(handler) === 'function') {
				handler(aPath, internalLoadCallback)
			} else {
				callback(null)
			}

		} else if (stats.isDirectory()) {
			exports.scanDir(aPath, results, loadHandlers, callback)
		}
	})
}

module.exports.scanDir = function(aPath, results, loadHandlers, callback) {
	fs.readdir(aPath, function(err, files) {
		async.map(files, function(file, _callback) {
			exports.statAndAct(path.join(aPath, file), results, loadHandlers, _callback)
		}, callback)
	})
}

module.exports.handle = function (pat, handler, handlers) {
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

module.exports.loadRawFile = function(file, callback) {
	fs.readFile(file, function (err, data) {
		if (err)
			return callback(err)

		callback(null, data)
	})
}

module.exports.loadRawUtf8File = function(file, callback) {
	fs.readFile(file, 'utf8', function (err, data) {
		if (err)
			return callback(err)

		callback(null, data)
	})
}

module.exports.loadJsonFile = function(file, callback) {
	fs.readFile(file, function (err, data) {
		if (err)
			return callback(err)

		callback(null, JSON.parse(data))
	})
}