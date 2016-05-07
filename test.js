var FileIndex = require('./index.js')
var assert = require('assert')
var fs = require('fs')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var path = require('path')

var TEST_DIR = path.resolve(__dirname, 'testfiles')

var SINGLE_FILE_TEST_DIR = path.join(TEST_DIR, 'single')
var MULTI_FILE_TEST_DIR = path.join(TEST_DIR, 'multi')
var NESTED_TEST_DIR = path.join(MULTI_FILE_TEST_DIR, 'nested')

function getCount(dict) {
	var count = 0
	for (var p in dict) {
		count++
	}
	return count
}

describe('file index', function() {

	var handlers = FileIndex
		.handle('*.json', FileIndex.loadJsonFile)
		.handle('*', FileIndex.loadJsonFile)
		.create()

	beforeEach(function() {
		rimraf.sync(TEST_DIR)
		mkdirp.sync(TEST_DIR)

		mkdirp.sync(SINGLE_FILE_TEST_DIR)
		mkdirp.sync(MULTI_FILE_TEST_DIR)
		mkdirp.sync(NESTED_TEST_DIR)

		fs.writeFileSync(path.join(SINGLE_FILE_TEST_DIR, 'test1.json'), JSON.stringify({ test: 1 }))
		fs.writeFileSync(path.join(MULTI_FILE_TEST_DIR, 'test1.json'), JSON.stringify({ test: 1 }))
		fs.writeFileSync(path.join(MULTI_FILE_TEST_DIR, 'test2.json'), JSON.stringify({ test: 2 }))
		fs.writeFileSync(path.join(NESTED_TEST_DIR, 'test3.json'), JSON.stringify({ test: 3 }))
		fs.writeFileSync(path.join(NESTED_TEST_DIR, 'test4.zzz'), JSON.stringify({ test: 4 }))
	})

	it('loads a json file', function(done) {
		var target = path.join(SINGLE_FILE_TEST_DIR, 'test1.json')
		
		FileIndex.load(target, handlers, function(err, results) {
			assert.strictEqual(getCount(results), 1)
			assert.ok(target in results)
			assert.strictEqual(results[target].test, 1)
			done(err)
		})
	})

	it('loads all json files from a path recursively', function(done) {
		var t1 = path.join(MULTI_FILE_TEST_DIR, 'test1.json')
		var t2 = path.join(MULTI_FILE_TEST_DIR, 'test2.json')
		var t3 = path.join(NESTED_TEST_DIR, 'test3.json')

		FileIndex.load(MULTI_FILE_TEST_DIR, handlers, function(err, results) {

			assert.strictEqual(getCount(results), 4)

			assert.ok(t1 in results)
			assert.strictEqual(results[t1].test, 1)

			assert.ok(t2 in results)
			assert.strictEqual(results[t2].test, 2)

			assert.ok(t3 in results)
			assert.strictEqual(results[t3].test, 3)

			done(err)
		})
	})

	it('loads all json files from an array of paths and recursively', function(done) {
		var t0 = path.join(SINGLE_FILE_TEST_DIR, 'test1.json')
		var t1 = path.join(MULTI_FILE_TEST_DIR, 'test1.json')
		var t2 = path.join(MULTI_FILE_TEST_DIR, 'test2.json')
		var t3 = path.join(NESTED_TEST_DIR, 'test3.json')

		FileIndex.load([MULTI_FILE_TEST_DIR, SINGLE_FILE_TEST_DIR], handlers, function(err, results) {

			assert.strictEqual(getCount(results), 5)

			assert.ok(t0 in results)
			assert.strictEqual(results[t0].test, 1)

			assert.ok(t1 in results)
			assert.strictEqual(results[t1].test, 1)

			assert.ok(t2 in results)
			assert.strictEqual(results[t2].test, 2)

			assert.ok(t3 in results)
			assert.strictEqual(results[t3].test, 3)

			done(err)
		})
	})

	it('loads with filename pattern', function(done) {
		var t1 = path.join(MULTI_FILE_TEST_DIR, 'test1.json')

		FileIndex.load([MULTI_FILE_TEST_DIR], [{ pattern: '*1.json', handler: FileIndex.loadJsonFile }], function(err, results) {
			assert.strictEqual(getCount(results), 1)
			assert.ok(t1 in results)
			assert.strictEqual(results[t1].test, 1)

			done(err)
		})
	})

	it('scans', function(done) {
		var t1 = path.join(MULTI_FILE_TEST_DIR, 'test1.json')
		var t2 = path.join(MULTI_FILE_TEST_DIR, 'test2.json')
		var t3 = path.join(NESTED_TEST_DIR, 'test3.json')
		var t4 = path.join(NESTED_TEST_DIR, 'test4.zzz')

		FileIndex.scan(MULTI_FILE_TEST_DIR, '*.json', function(err, files) {
			assert.strictEqual(getCount(files), 3)

			assert.ok(t1 in files)
			assert.ok(t2 in files)
			assert.ok(t3 in files)
			assert.ok(!(t4 in files))

			done(err)
		})
	})

	it('by default, loads json files and parse then, as well as load the rest of the files as buffers', function(done) {
		var target = path.join(SINGLE_FILE_TEST_DIR, 'test1.json')
		FileIndex.load(target, function(err, results) {
			assert.strictEqual(getCount(results), 1)
			assert.ok(target in results)
			assert.strictEqual(results[target].test, 1)
			done(err)
		})
	})

	it('bad json files', function(done) {
		var file = path.join(SINGLE_FILE_TEST_DIR, 'bad.json')

		fs.writeFileSync(file, '{ "asds": assss }')
		for (var i = 0; i < 10; i++) {
			fs.writeFileSync(path.join(SINGLE_FILE_TEST_DIR, i + '.json'), '{ "asds": "assss" }')
		}

		FileIndex.load(SINGLE_FILE_TEST_DIR, function(err, results) {
			assert.strictEqual(err.message, 'failed to parse file')
			done()
		})
	})
})
