// @title : **elucidate.js**
// @version : 0.1
// @date : 8/18/14
// @description : Combining annotated source documentation (think [docco](http://jashkenas.github.io/docco/)) with quick psuedo-[markdown](http://daringfireball.net/projects/markdown/) & [prettify](http://code.google.com/p/google-code-prettify/) to generate beautiful source documentation in realtime, client side, instead of on a server.
// @dependancies : [jQuery](http://jquery.com), [bootstrap](http://getbootstrap.com), [prettify](http://code.google.com/p/google-code-prettify/)
// @references : [docco](http://jashkenas.github.io/docco/), [markdown](http://daringfireball.net/projects/markdown/)
// ============================
// jsHint directives
/*jshint multistr:true */
/*global alert $ document window prettyPrint */

// Begin Closure
// -------------
// elucidate.js is a jQuery plugin
(function ( $ ) {
    $.fn.elucidate = function( options ) {

        // Variable Definitions
        // --------------------
        // `DOM` object for documentation
        // `AJAX` handler
        var element,
            sourceXhr;

        // default settings
        var defaults = {
            source         : 'path/to/file.source',
            pretty         : true,
            bootstrap      : true,
            indent         : "  ",
            width          : {comment:4,code:8,hack:64},
            headerFormater : undefined
        };
        // extend with user settings
        // allows simple source file string or full option object
        var settings = {};
        if ( typeof( options ) === 'string' ) {
            settings = $.extend( {}, defaults, {source: options} );
        } else {
            settings = $.extend( {}, defaults, options );
        }

        // Function Definitions
        // --------------------
        // ### Error message handler ###
        function displayError( error ) {
            element.html('<h1>Something went wrong :</h1><h3>'+error+'</h3>');
        }

        // ### Pseudo-markdown ###
        function cheapMarkdown( str ) {

            var lines = [];

            str = str.replace(/(.*)\|(=)+\|/, '<h1>$1</h1><hr>');
            str = str.replace(/(.*)\|(-)+\|/, '<h2>$1</h2><hr>');

            str.split(/\|/).forEach( function( line ) {

                var links = [];

                // make whitespace non-breaking
                line = line.replace( /([ ]{2})/g, '&nbsp;&nbsp;' );

                // replace headings
                line = line
                    .replace( /#{6}([^\)][^#]+)#+/g, '<h6>$1</h6>' )
                    .replace( /#{5}([^\)][^#]+)#+/g, '<h5>$1</h5>' )
                    .replace( /#{4}([^\)][^#]+)#+/g, '<h4>$1</h4>' )
                    .replace( /#{3}([^\)][^#]+)#+/g, '<h3>$1</h3>' )
                    .replace( /#{2}([^\)][^#]+)#+/g, '<h2>$1</h2>' )
                    .replace( /#{1}([^\)][^#]+)#+/g, '<h1>$1</h1>' );

                // replace emphasis
                line = line
                    .replace( /[\*]{2}([^\*]+)[\*]{2}/g, '<strong>$1</strong>' )
                    .replace( /[_]{2}([^_]+)[_]{2}/g, '<strong>$1</strong>' )
                    .replace( /[\*]([^\*]+)[\*]/g, '<em>$1</em>' )
                    .replace( /[_]([^_]+)[_]/g, '<em>$1</em>' );

                // replace code
                line = line
                    .replace( /`([^`]+)`/g, '<code>$1</code>' );

                // create links
                links = [];
                line.split(/(\[[^\]]+\]\([^\)]+\))/)
                    .forEach(function( lk ) {
                        links.push( lk.replace(/\[(.*)\]\((.*)\)/g,'<a href="$2" target="blank">$1</a>') );
                    });
                // join to string & shifting puncuation
                line = links.join(' ').replace( /\s([.,;!?\'\"])/g ,"$1" );

                lines.push( line );
            } );

            str = lines.join('</br>');

            return str;
        }

        // ### Format Header ###
        // user defined or fallback to default
        function formatHeader( str ) {
            var defaultInfo = ['title','author','version','date','description','dependancies','references'];
            var info        = {
                title        : undefined,
                author       : undefined,
                version      : undefined,
                date         : undefined,
                description  : undefined,
                dependancies : undefined,
                references   : undefined
            },
            headerinfo      = [];

            // go thru each line of header
            str.split(/\|/).forEach( function( line, indx ) {

                // parse file attributes and store name + value ( will use markdown to handle links/emphasis )
                headerinfo = line.match(/@(.+?) *?: *?(.+)/);

                if ( headerinfo ) {
                    info[headerinfo[1]] = cheapMarkdown( headerinfo[2] );
                }

            } );

            // use custom user formater
            if ( settings.header ) {
                str = settings.headerFormater( info );
            } else {
                // build special `html` for header info
                var sourceFile      = '<small><a href="'+ settings.source +'"><span class="glyphicon glyphicon-file"></span></a></small>';
                var authorStr       = ( info.author )       ? '<small> by '+info.author + '</small>'      : '';
                var descriptionStr  = ( info.description )  ? '<p class="lead">'+info.description+'</p>'  : '';
                var versionStr      = ( info.version )      ? 'Version '+info.version                     : '';
                var dateStr         = ( info.date )         ? ' from '+info.date                          : '';
                var dependanciesStr = ( info.dependancies ) ? 'Dependancies : '+info.dependancies         : '';
                var referencesStr   = ( info.references )   ? 'References : '+info.references             : '';

                str = '<h1>' + sourceFile + info.title + authorStr + '</h1>' + descriptionStr + '<p>'+ versionStr + dateStr +'<br>'+ dependanciesStr + '<br>'+ referencesStr + '</p>';

                var usrStr = '';
                // look for other user custom fields
                for (var key in info) {
                    if ( $.inArray( key, defaultInfo ) === -1 ) {
                        usrStr += key[0].toUpperCase()+key.slice(1)+' : '+info[key]+'<br>';
                    }
                }

                str += '<p>' + usrStr + '</p>' + '<hr>';
            }

            return str;
        }

        // ### make `html` safe for inserting into `pre` tags ###
        function safeHtml( str ) {
            str = str
                .replace(/&/g,'&amp;')
                .replace(/</g,'&lt;')
                .replace(/>/g,'&gt;')
                .replace(/"/g,'&quot;')
                .replace(/'/g,'&apos;')
                .replace(/[\t]/g, settings.indent );
            return str;
        }


        // ### section parser ###
        // parses out each line into comment vs code sections
        // each line is buffered until the 'rules' that define a section are met.
        function parseSections( sourceStr ) {

            // comment symbol
            // filter out comments
            // source lines
            // sections (comment & code)
            // line string
            // comment string
            // code string
            // flag if line contains code
            var commentMatch = RegExp("^\\s*" + "//" + "\\s?"),
                commentFilt  =  /(^#![\/]|^\s*#\{)/,
                lines        = [],
                sections     = [],
                line         = '',
                commentText  = '',
                codeText     = '',
                containsCode = '';

            // helper function to add lines to sections and clear flags
            var save = function() {
                sections.push({
                    comment: commentText,
                    code   : codeText
                });
                containsCode = commentText = codeText = '';
                return '';
            };

            // split the source by lines
            lines = sourceStr.split(/\n/);

            // go thru each line
            for ( var i = 0 ; i < lines.length ; i++  ) {
                line = lines[i];

                // if line is a comment, save last buffered data if it contains code
                if ( line.match( commentMatch ) && !line.match( commentFilt ) ) {
                    if( containsCode ) {
                        save();
                    }
                    // add to comment buffer
                    commentText += ( line = line.replace( commentMatch, '' ) ) + '|';
                    // if special heading line, save comment buffer as a new section
                    if( /^(---+|===+)$/.test( line ) ) {
                        save();
                    }
                // keep buffering code until next comment
                } else {
                    containsCode = true;
                    codeText    += line + '\n';
                }
            }
            // save last section and return
            save();
            return sections;
        }

        // ### create documentation `html` from parsed code ###
        // takes parsed sections and builds `html` for nice looking annotated source
        function createDocumentation( sections ) {

            var documentedHtml = '',
                commentHtml    = '',
                codeHtml       = '',
                pretty         = ( settings.pretty ) ? 'prettyprint' : '',
                linenums       = 0;

            sections.forEach( function( s, indx ) {

                // add comments to line count since they always occur in a section before code
                linenums    += s.comment.split(/\|/).length - 1;
                if ( indx === 0) {
                    commentHtml     = '<div class="elucidate-comment-header">' + formatHeader( s.comment ) + '</div>';
                    documentedHtml +=
                        '<div class="row elucidate-header"> \
                            <div class="col-sm-12">'+commentHtml+'</div> \
                        </div> \
                        <div class="row elucidate-row"> \
                            <div class="col-sm-'+settings.width.comment+' elucidate-col-comment"><div class="elucidate-comment elucidate-hack-width">'+Array(settings.width.hack).join('&nbsp;')+'</div></div> \
                            <div class="col-sm-'+settings.width.code+' elucidate-col-code"></div></div> \
                        </div>';
                } else {
                    commentHtml     = '<div class="elucidate-comment">' + cheapMarkdown( s.comment ) + '</div>';
                    codeHtml        = (s.code !== '') ? '<pre class="elucidate-code '+pretty+' linenums:'+(linenums+1).toString() +'">' + safeHtml( s.code ) + '</pre>' : '';
                    documentedHtml +=
                        '<div class="row elucidate-row"> \
                            <div class="col-sm-'+settings.width.comment+' elucidate-col-comment">'+commentHtml+'</div> \
                            <div class="col-sm-'+settings.width.code+' elucidate-col-code">'+codeHtml+'</div> \
                        </div>';

                }
                // add code to line count
                linenums += s.code.split(/\n/).length - 1 ;
            } );

            return documentedHtml;
        }

        // iterate over elements if need be
        return this.each( function() {
            // Main Code
            // ---------
            // cache DOM object
            element   = $(this);
            // get the source code via ajax
            sourceXhr = $.get( settings.source, function( source ) {

                var sections       = parseSections( source );
                var elucidatedHtml = createDocumentation( sections );

                // throw it to the DOM
                element.addClass( 'elucidate' );
                element.html( elucidatedHtml );

                // prettify if desired
                if ( settings.pretty ) {
                    prettyPrint();
                }

                // add done class
                element.addClass( 'elucidated' );
            }, 'text' );

            // if ajax fails display error
            sourceXhr.fail( function() {
                displayError('This source file, <strong>'+settings.source+'</strong>, was not found.');
            } );

            return false;
        });
    };
})( jQuery );
// finis
