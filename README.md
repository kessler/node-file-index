# file-index

Quickly create an in memory index of files and (optionally) their content

Uses [minimatch](https://github.com/isaacs/minimatch) to filter files included in the index

### simple
```
var FileIndex = require('file-index')

FileIndex.load(['/some/path'], function (err, results) {
	// loads and parses json files
	// loads all the rest of the files as buffers
	// results: { '/some/path/1.json': { a: 1}, '/some/path/2.txt': buffer }
})

FileIndex.scan(['/some/path'], function(err, files) {
	// scan all files in path recursively and returns an index
	// { '/some/path/1': stat, '/some/path/2': stat }
	// where stat is the result of running fs.stat on each file
})
```

### customize
```
function myCustomHandler(fullPathFilename, callback) {
	fs.readFile(fullPathFilename, function (err, content) {
		if (err) return callback(err)

		callback(null, customParse(content))
	})	
}

var handlers = FileIndex	
	.handle('*.json', FileIndex.loadJsonFile) // load and parse .json files	
	.handle('*.foo', FileIndex.loadRawFile)	// .foo as buffers
	.handle('*.bar', FileIndex.loadRawUtf8File) // .bar as text
	.handle('*', myCustomHandler) // a non mandatory fallthrough custom handler
	.create()

// mix directories and files
FileIndex.load(['/some/path/', '/some/file.bar', '/yet/another/path'], handlers, function(err, results) {
	console.log(err, results)

	/* 
		results:
		
		{
			'/some/path/1.json': { blabla: 1 },
			'/some/path/2.json': { blabla: 2},
			'/some/file.bar': 'foorbar',
			'/yet/another/path/x.log': 'a b c'
		}
	*/
})
```

// TODO: improve test coverage
