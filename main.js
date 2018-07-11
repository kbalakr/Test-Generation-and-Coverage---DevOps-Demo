var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var faker = require("faker");
var fs = require("fs");
faker.locale = "en";
var mock = require('mock-fs');
var _ = require('underscore');
var Random = require('random-js');

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		args = ["subject.js"];
	}
	var filePath = args[0];

	constraints(filePath);

	generateTestCases(filePath)

}

var engine = Random.engines.mt19937().autoSeed();

function createConcreteIntegerValue( greaterThan, constraintValue )
{
	if( greaterThan )
		return Random.integer(constraintValue,constraintValue+10)(engine);
	else
		return Random.integer(constraintValue-10,constraintValue)(engine);
}

function Constraint(properties)
{
	this.ident = properties.ident;
	this.expression = properties.expression;
	this.operator = properties.operator;
	this.value = properties.value;
	this.altvalue = properties.altvalue;
	this.altervalue = properties.altervalue;
	this.alternatevalue = properties.alternatevalue;
	this.funcName = properties.funcName;
	// Supported kinds: "fileWithContent","fileExists"
	// integer, string, phoneNumber
	this.kind = properties.kind;
}

function fakeDemo()
{
	console.log( faker.phone.phoneNumber() );
	console.log( faker.phone.phoneNumberFormat() );
	console.log( faker.phone.phoneFormats() );
}

var functionConstraints =
{
}

var mockFileLibrary = 
{
	pathExists:
	{
		'path/fileExists': {}
	},
	fileWithContent:
	{
		pathContent: 
		{	
  			file1: 'text content',
			file2: ''
		}
	}
};

function initalizeParams(constraints)
{
	var params = {};
	
	// initialize params
	for (var i =0; i < constraints.params.length; i++ )
	{
		var paramName = constraints.params[i];
		params[paramName] = '\'\'';
	}
	
	return params;	
}

function fillParams(constraints,params,property)
{
	// plug-in values for parameters
		for( var c = 0; c < constraints.length; c++ )
		{
			
		    var constraint = constraints[c];
			if(constraint.kind == "match_phone_format") 
			
			{	
				for(  i=0; i < Object.keys(params).length; i++ )	
				{
					
					if(params[Object.keys(params)[i]].length == 0)
					{
						params[Object.keys(params)[i]]=constraint[property];

					}
					if(typeof(Object.keys(params)[i]) == "string")
					{
						params[Object.keys(params)[i]]=constraint[property];
					}
				}				
			}
			
			if (params.hasOwnProperty( constraint.ident) && constraint.kind == "string_index" && property=="altervalue")
			{
				params[constraint.ident] = constraint[property];
			}			
			if (params.hasOwnProperty( constraint.ident) && constraint.kind == "not_string" && property=="alternatevalue")
			{				
				params[constraint.ident] = constraint[property];
			}
			if( params.hasOwnProperty( constraint.ident) && constraint.kind != "string_index" && constraint.kind != "not_string")
			{	
				if (constraint.kind == "string" && property=="altervalue") continue;
				if (constraint.kind == "string" && property=="alternatevalue") continue;
				params[constraint.ident] = constraint[property];
			} 
			
			
			
			
		}
	
}

function create_arguments_combo(args,altargs)
{
	var args_values=args.split(",");
	var altargs_values=altargs.split(",");
	var args_final1=[];
	var args_final2=[];
	var args_final3=[];
	var args_final4=[];
	var condition1=true;
	var condition2=true;
	
		
	for (i=0;i<args_values.length;i++){
		var temp=[];
		for (j=0;j<altargs_values.length;j++){
			if (i==j)
				temp[j]=args_values[i];
			else 
				temp[j]=altargs_values[j];
		}
		args_final1[i]=temp.join(",");
	}
	
	for (i=0;i<altargs_values.length;i++){
		var temp=[];
		for (j=0;j<args_values.length;j++){
			if (i==j)
				temp[j]=altargs_values[i];
			else 
				temp[j]=args_values[j];
		}
		args_final2[i]=temp.join(",");
	}
	
        
			
	for (i=0;i<args_values.length;i++){
		var temp=[];
		if (i==args_values.length-1){
			var outer_temp=[i,0];
			condition1=true;
		}	
		else{
			var outer_temp=[i,i+1];
			condition1=false;
		}    
		for (j=0;j<altargs_values.length;j++){
			if(j==outer_temp[0])
				temp[j]=args_values[i];
			else if (j==outer_temp[1] && condition1 == false)
				temp[j]=args_values[i+1];
			else if (j==outer_temp[1] && condition1 == true)
				temp[j]=args_values[0];
			else
				temp[j]=altargs_values[j];
		}
		args_final3[i]=temp.join(",");
	} 
	
	
	for (i=0;i<altargs_values.length;i++){
		var temp=[];
		if (i==altargs_values.length-1){
			var outer_temp=[i,0];
			condition2=true;
		}	
		else{
			var outer_temp=[i,i+1];
			condition2=false;
		}    
		for (j=0;j<args_values.length;j++){
			if(j==outer_temp[0])
				temp[j]=altargs_values[i];
			else if (j==outer_temp[1] && condition2 == false)
				temp[j]=altargs_values[i+1];
			else if (j==outer_temp[1] && condition2 == true)
				temp[j]=altargs_values[0];
			else
				temp[j]=args_values[j];
		}
		args_final4[i]=temp.join(",");
	} 
	var argsFinal = [];
	argsFinal = args_final1.concat(args_final2);
	argsFinal = argsFinal.concat(args_final3);
	argsFinal = argsFinal.concat(args_final4);
	return argsFinal;
}

function generateTestCases(filePath)
{

	var content = "var subject = require('./"+ filePath +"')\nvar mock = require('mock-fs');\n";
	for ( var funcName in functionConstraints )
	{

		var params = initalizeParams(functionConstraints[funcName])
		var altparams = initalizeParams(functionConstraints[funcName])
		var alterparams = initalizeParams(functionConstraints[funcName])
		var alternateparams = initalizeParams(functionConstraints[funcName])
		var argsFinal=[];
		// update parameter values based on known constraints.
		var constraints = functionConstraints[funcName].constraints;
		
		// Handle global constraints...
		var fileWithContent = _.some(constraints, {kind: 'fileWithContent' });
		var pathExists      = _.some(constraints, {kind: 'fileExists' });

		fillParams(constraints,params,"value")
		fillParams(constraints,altparams,"altvalue")
		fillParams(constraints,alterparams,"altervalue")
		fillParams(constraints,alternateparams,"alternatevalue")
		
		
		
		//console.log("ALT",altparams)
		//console.log("P",params)

		// Prepare function arguments.
		
		var args = Object.keys(params).map( function(k) {return params[k]; }).join(",");	
		var altargs = Object.keys(altparams).map( function(k) {return altparams[k]; }).join(",");
		var alterargs = Object.keys(alterparams).map( function(k) {return alterparams[k]; }).join(",");
		var alternateargs = Object.keys(alternateparams).map( function(k) {return alternateparams[k]; }).join(",");
		
		argsFinal=create_arguments_combo(args,altargs);
		argsFinal1=create_arguments_combo(args,alterargs);
		argsFinal2=create_arguments_combo(args,alternateargs);
		argsFinal3=create_arguments_combo(altargs,alterargs);
		argsFinal4=create_arguments_combo(altargs,alternateargs);
		
		
		argsFinal=argsFinal.concat(argsFinal1);
		argsFinal=argsFinal.concat(argsFinal2);
		argsFinal=argsFinal.concat(argsFinal3);
		argsFinal=argsFinal.concat(argsFinal4);
		
		argsFinal = argsFinal.filter( function( item, index, inputArray ) {
           return inputArray.indexOf(item) == index;
        });

		if( pathExists || fileWithContent )
		{
			for(j = 0; j<argsFinal.length; j++){
				content += generateMockFsTestCases(pathExists,fileWithContent,funcName, argsFinal[j]);
			// Bonus...generate constraint variations test cases....
				content += generateMockFsTestCases(!pathExists,fileWithContent,funcName, argsFinal[j]);
				content += generateMockFsTestCases(pathExists,!fileWithContent,funcName, argsFinal[j]);
				content += generateMockFsTestCases(!pathExists,!fileWithContent,funcName, argsFinal[j]);
			}
		}
		else
		{

			//console.log( altargs )
			// Emit simple test case.
			content += "subject.{0}({1});\n".format(funcName, args );
			content += "subject.{0}({1});\n".format(funcName, altargs );
			for (i=0;i<argsFinal.length;i++){
				content += "subject.{0}({1});\n".format(funcName, argsFinal[i] );
			}
			
			
			
		}
        
	}


	fs.writeFileSync('test.js', content, "utf8");

}

function generateMockFsTestCases (pathExists,fileWithContent,funcName,args) 
{
	var testCase = "";
	// Build mock file system based on constraints.
	var mergedFS = {};
	if( pathExists )
	{
		for (var attrname in mockFileLibrary.pathExists) { mergedFS[attrname] = mockFileLibrary.pathExists[attrname]; }
	}
	if( fileWithContent )
	{
		for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
	}

	testCase += 
	"mock(" +
		JSON.stringify(mergedFS)
		+
	");\n";

	testCase += "\tsubject.{0}({1});\n".format(funcName, args );
	testCase+="mock.restore();\n";
	return testCase;
}

function constraints(filePath)
{
   var buf = fs.readFileSync(filePath, "utf8");
	var result = esprima.parse(buf, options);

	traverse(result, function (node) 
	{
		if (node.type === 'FunctionDeclaration') 
		{
			var funcName = functionName(node);
			console.log("Line : {0} Function: {1}".format(node.loc.start.line, funcName ));

			var params = node.params.map(function(p) {return p.name});

			functionConstraints[funcName] = {constraints:[], params: params};

			// Check for expressions using argument.
			traverse(node, function(child)
			{
				
				if( child.type === 'BinaryExpression' && child.operator == "==" )
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						
						if (rightHand=="undefined")
						{	
						    functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: rightHand,
								altvalue: !rightHand,
								altervalue: !rightHand,
								alternatevalue: !rightHand,
								funcName: funcName,
								kind: "string",
								operator : child.operator,
								expression: expression
							}));
						
                        }
						
						else if (typeof(rightHand)=="number")
						{	
						    functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand),
								altvalue: parseInt(rightHand)-1,
								altervalue: parseInt(rightHand)-1,
								alternatevalue: parseInt(rightHand)-1,
								funcName: funcName,
								kind: "number",
								operator : child.operator,
								expression: expression
							}));
						
                        }
						
						else if (typeof(rightHand)=="string")
						{	
						    functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: rightHand,
								altvalue: "\"junk\"",
								altervalue: "\"junk\"",
								alternatevalue: "\"junk\"",
								funcName: funcName,
								kind: "string",
								operator : child.operator,
								expression: expression
							}));
						
                        }
					}	
					else if( child.left.type == 'Identifier')
					{
						
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
	                    			
						var areacode=rightHand.substring(1,4);
						var number="-919-9191"
						correct_value=areacode + number;
						wrong_value= (parseInt(areacode)-1).toString() + number ;
						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: "\"" + correct_value + "\"",
								altvalue: "\"" + wrong_value + "\"",
								altervalue: "\"" + wrong_value + "\"",
								alternatevalue: "\"" + wrong_value + "\"",
								funcName: funcName,
								kind: "match_phone_format",
								operator : child.operator,
								expression: expression
							}));
								
					}
						
					
					
					else if( child.left.type == "CallExpression" && child.left.callee && 
						child.left.callee.property.name =="indexOf" )
					{ 
						var expression = buf.substring(child.range[0], child.range[1]);
						
						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.callee.object.name,
								value: "\"junk\"",
								altvalue: "\"junk\"",
								altervalue: "\"" + child.left.arguments[0].value + "\"",
								alternatevalue: "\"junk\"", 
								funcName: funcName,
								kind: "string_index",
								operator : child.operator,
								expression: expression
							}));
					}   
					
				}

				
				else if( child.type === 'BinaryExpression' && child.operator == "<" )
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])

						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand) - 1,
								altvalue: parseInt(rightHand) + 1,
								altervalue: parseInt(rightHand) + 1,
								alternatevalue: parseInt(rightHand) + 1,
								funcName: funcName,
								kind: "number",
								operator : child.operator,
								expression: expression
							}));		
					}

				}
				
				
				
				else if( child.type === 'BinaryExpression' && child.operator == ">" )
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])

						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand) + 1,
								altvalue: parseInt(rightHand) - 1,
								altervalue: parseInt(rightHand) - 1,
								alternatevalue: parseInt(rightHand) - 1,
								funcName: funcName,
								kind: "number",
								operator : child.operator,
								expression: expression
							}));		
					}	
				}
				
				
				else if( child.type === 'BinaryExpression' && child.operator == "!=" )
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						
						if (rightHand=="undefined")
						{	
						    functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: !rightHand,
								altvalue: rightHand,
								altervalue: rightHand,
								alternatevalue: rightHand,
								funcName: funcName,
								kind: "not_undefined",
								operator : child.operator,
								expression: expression
							}));
						
                        }
						
						else if (typeof(rightHand)=="number")
						{	
						    functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand)-1,
								altvalue: parseInt(rightHand),
								altervalue: parseInt(rightHand),
								alternatevalue: parseInt(rightHand),
								funcName: funcName,
								kind: "number",
								operator : child.operator,
								expression: expression
							}));
						
                        }
						
						else if (typeof(rightHand)=="string")
						{	
						    functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: "\"junk\"",
								altvalue: rightHand,
								altervalue: rightHand,
								alternatevalue: rightHand,
								funcName: funcName,
								kind: "not_string",
								operator : child.operator,
								expression: expression
							}));
						
                        }
						
					}
					else if( child.left.type == 'Identifier')
					{
						
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
	                    			
						var areacode=rightHand.substring(1,4);
						var number="-919-9191"
						correct_value=areacode + number;
						wrong_value= (parseInt(areacode)-1).toString() + number ;
						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: "\"" + wrong_value + "\"",
								altvalue: "\"" + correct_value + "\"",
								altervalue: "\"" + correct_value + "\"",
								alternatevalue: "\"" + correct_value + "\"", 
								funcName: funcName,
								kind: "match_phone_format",
								operator : child.operator,
								expression: expression
							}));
								
					}
                }					
			

				if( child.type == "CallExpression" && 
					 child.callee.property &&
					 child.callee.property.name =="readFileSync" )
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								value:  "'pathContent/file1'",
								altvalue: "'pathContent/file2'",
								altervalue: "'pathContent/file2'",
								alternatevalue: "'pathContent/file2'",
								funcName: funcName,
								kind: "fileWithContent",
								operator : child.operator,
								expression: expression
							}));
						}
					}
				}

				if( child.type == "CallExpression" &&
					 child.callee.property &&
					 child.callee.property.name =="existsSync")
				{
					for( var p =0; p < params.length; p++ )
					{
						if(params[0]=="dir")
						{	
							if( child.arguments[0].name == params[p] )
							{
								functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: params[0],
									// A fake path to a file
									value:  "'path/fileExists'",
									altvalue: "''",
									altervalue: "''",
									alternatevalue: "''",
									funcName: funcName,
									kind: "fileExists",
									operator : child.operator,
									expression: expression
								}));
							}
						}	
						else if(params[0]=="filePath")
						{	
							if( child.arguments[0].name == params[p] )
							{
								functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: params[1],
									// A fake path to a file
									value:  "'path/fileExists'",
									altvalue: "''",
									altervalue: "''",
									alternatevalue: "''",
									funcName: funcName,
									kind: "fileExists",
									operator : child.operator,
									expression: expression
								}));
							}
						}
					}
				}
				
				if (child.type=="UnaryExpression" && 
				    child.argument && 
					child.argument.property && 
					child.argument.property.type == "Identifier")
				{
					var normparamtrue={};
					var normparamfalse={};
                    normparamtrue[child.argument.property.name]=true;
                    normparamfalse[child.argument.property.name]=false;		
                    functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: child.argument.object.name,
									value:  JSON.stringify(normparamtrue),
									altvalue: JSON.stringify(normparamfalse),
									altervalue: JSON.stringify(normparamfalse),
									alternatevalue: JSON.stringify(normparamfalse),
									funcName: funcName,
									kind: "Identifier",
									operator : child.operator,
									expression: expression
								}));					
			
				}
			});

			console.log( functionConstraints[funcName]);

		}
	});
}

function traverse(object, visitor) 
{
    var key, child;

    visitor.call(null, object);
    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null) {
                traverse(child, visitor);
            }
        }
    }
}

function traverseWithCancel(object, visitor)
{
    var key, child;

    if( visitor.call(null, object) )
    {
	    for (key in object) {
	        if (object.hasOwnProperty(key)) {
	            child = object[key];
	            if (typeof child === 'object' && child !== null) {
	                traverseWithCancel(child, visitor);
	            }
	        }
	    }
 	 }
}

function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "";
}


if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

main();
exports.main = main;
