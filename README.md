Elucidate.js
============
Client side annotated source documentation.

Description
-----------
Combining annotated source documentation (think [docco](http://jashkenas.github.io/docco/)) with quick psuedo-[markdown](http://daringfireball.net/projects/markdown/) & [prettify](http://code.google.com/p/google-code-prettify/) to generate beautiful source documentation in realtime, client side, instead of on a server.

### Language Support
- [x] Javascript

### Dependancies

- [jQuery](http://jquery.com)
- [bootstrap](http://getbootstrap.com)
- [prettify](http://code.google.com/p/google-code-prettify/)

Code Examples
-------------

Include `elucidate.js` in the `<head>` of an `html` page.

```html
<head>
    ....
    ....
    <script src="elucidate.js"></script>
</head>
```

Add a `<div>` placeholder for the documentation somewhere in the `<body>` of the `html` page.

```html
<body>
    ....
    <div id="annotated-source"></div>
    ....
```

Call `elucidate()` on the `<div>` with the filepath of the source code as the argument at the end of the `<body>` fo the `html` page.

```html
    ....
    <script>
        $(document).ready(function() {
            $('#annotated-source').elucidate('elucidate.js');
        });
    </script>
</body>
```

Todo
----
- [ ] Provide multiple language support

License
-------
[MIT](https://github.com/tmthydvnprt/elucidate/blob/master/LICENSE)
