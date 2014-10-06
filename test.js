var FileIndex = require('./index.js')
var assert = require('assert')
var fs = require('fs')

var path = require('path')

var TEST_DIR = path.resolve(__dirname, 'testfiles')

var SINGLE_FILE_TEST_DIR = path.join(TEST_DIR, 'single')
var MULTI_FILE_TEST_DIR = path.join(TEST_DIR, 'multi')
var NESTED_TEST_DIR = path.join(MULTI_FILE_TEST_DIR, 'nested')

function delTreeSync(dir, delTop) {
	var files = fs.readdirSync(dir)
	for (var i = 0; i < files.length; i++) {
		var file = path.join(dir, files[i])
		var stat = fs.statSync(file)
		if (stat.isFile()) {
			fs.unlinkSync(file)
		} else if (stat.isDirectory()) {
			delTreeSync(file, true)
		} else {
			throw new Error('cannot delete ' + file)
		}
	}

	if (delTop)
		fs.rmdirSync(dir)
}

function getCount(dict) {
	var count = 0
	for (var p in dict) {
		count++
	}
	return count
}

describe('file index', function () {

	var handlers = FileIndex
		.handle('*.json', FileIndex.loadJsonFile)
		.handle('*', FileIndex.loadJsonFile)
		.create()

	before(function() {
		var exists = fs.existsSync(TEST_DIR)

		if (exists) {
			delTreeSync(TEST_DIR, false)
		} else {
			fs.mkdirSync(TEST_DIR)
		}

		fs.mkdirSync(SINGLE_FILE_TEST_DIR)
		fs.mkdirSync(MULTI_FILE_TEST_DIR)
		fs.mkdirSync(NESTED_TEST_DIR)

		fs.writeFileSync(path.join(SINGLE_FILE_TEST_DIR, 'test1.json'), JSON.stringify({ test: 1}))
		fs.writeFileSync(path.join(MULTI_FILE_TEST_DIR, 'test1.json'), JSON.stringify({ test: 1}))
		fs.writeFileSync(path.join(MULTI_FILE_TEST_DIR, 'test2.json'), JSON.stringify({ test: 2}))
		fs.writeFileSync(path.join(NESTED_TEST_DIR, 'test3.json'), JSON.stringify({ test: 3}))
		fs.writeFileSync(path.join(NESTED_TEST_DIR, 'test4.zzz'), JSON.stringify({ test: 4}))
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

	it('loads all json files from a path recursively', function (done) {
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

	it('loads all json files from an array of paths and recursively', function (done) {
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

	it('loads with filename pattern', function (done) {
		var t1 = path.join(MULTI_FILE_TEST_DIR, 'test1.json')
		
		FileIndex.load([MULTI_FILE_TEST_DIR], [ { pattern: '*1.json', handler: FileIndex.loadJsonFile } ], function(err, results) {
			assert.strictEqual(getCount(results), 1)
			assert.ok(t1 in results)
			assert.strictEqual(results[t1].test, 1)

			done(err)
		})
	})

	it('scans', function  (done) {
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
})
