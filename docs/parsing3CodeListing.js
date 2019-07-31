//Code Listing 1
var lexicon = ISHML.Lexicon().register("baa").as({part:"bleat" })
                            
var bleat=ISHML.Rule().configure({filter:(definition)=>definition.part==="bleat"})	

var goat=ISHML.Rule().configure({mode:ISHML.enum.mode.apt})  //Correct
	.snip(1)
	.snip(2)
goat[1].snip("bleat",bleat.clone()).snip("goat",goat)
goat[2].snip("bleat",bleat.clone())

var kid=goat.clone().configure({mode:ISHML.enum.mode.any}) //Inefficient

var sheep=ISHML.Rule().configure({mode:ISHML.enum.mode.apt}) //Wrong
	.snip(1)
	.snip(2)
sheep[1].snip("bleat",bleat.clone())	
sheep[2].snip("bleat",bleat.clone()).snip("sheep",sheep)

var wolf=ISHML.Rule() //Wrong-- stack overflow
	.snip(1)
	.snip(2)
wolf[1].snip("sheep",wolf).snip("bleat",bleat.clone())
wolf[2].snip("bleat",bleat.clone())

var lambs=ISHML.Rule().snip("bleat") //Correct
lambs.bleat.configure({maximum:Infinity})

//Code Listing 2			
var lexicon=ISHML.Lexicon()
lexicon
	.register("0","1","2","3","4","5","6","7","8","9").as({part:"digit"})
	.register("(").as({part:"begin"})
	.register(")").as({part:"end"})
	.register("+").as({part:"termOp", operation:(a,b)=>a+b})
	.register("-").as({part:"termOp",operation:(a,b)=>a-b})
	.register("*").as({part:"factorOp",operation:(a,b)=>a*b})
	.register("/").as({part:"factorOp",operation:(a,b)=>a/b})
	.register("^","**").as({part:"powerOp",operation:(a,b)=>a**b})

var expression=ISHML.Rule()
var term=ISHML.Rule()	
var power=ISHML.Rule()
var group=ISHML.Rule()
var number=ISHML.Rule()

expression.snip("term",term).snip("operations")
expression.operations.snip("operator").snip("operand",term)
	.configure({minimum:0, maximum:Infinity,greedy:true})
expression.operations.operator.configure({filter:(definition)=>definition.part==="termOp"})

term.snip("power",power).snip("operations")
term.operations.snip("operator").snip("operand",power)
	.configure({minimum:0, maximum:Infinity, greedy:true})
term.operations.operator.configure({filter:(definition)=>definition.part==="factorOp"})

power.snip("group",group).snip("operations")
power.operations.snip("operator").snip("operand",power)
	.configure({minimum:0, greedy:true})
power.operations.operator.configure({filter:(definition)=>definition.part==="powerOp"})

group.configure({mode:ISHML.enum.mode.apt})
	.snip(1)
	.snip(2,number)
group[1].snip("begin").snip("expression",expression).snip("end")
group[1].begin.configure({keep:false,filter:(definition)=>definition.part==="begin"})         
group[1].end.configure({keep:false,filter:(definition)=>definition.part==="end"}) 

number.configure({maximum:Infinity,greedy:true,filter:(definition)=>definition.part==="digit"})
	.semantics=(interpretation)=>
	{
		interpretation.gist=Number(interpretation.gist.map(({lexeme})=>lexeme).join(""))
		return interpretation
	}

getOperation=(interpretation)=>
{
	interpretation.gist=interpretation.gist.definitions[0].operation
	return interpretation
}

calculate=(interpretation)=>
{
	var {gist} = interpretation
	var {expression, term, power, group, operand,operations}=gist
	var result=expression || term || power || group ||operand|| gist
	if (operations)
	{
		if (operations instanceof Array)
		{
			operations.forEach(function(operation)
			{
			result=operation.operator(result,operation.operand)
			})
		}
		else
		{
			result=operations.operator(result,operations.operand)
		}	
		
	}
	interpretation.gist=result
	return interpretation
}

expression.operations.operator.semantics=getOperation
term.operations.operator.semantics=getOperation	
power.operations.operator.semantics=getOperation

expression.semantics=calculate
term.semantics=calculate    
group.semantics=calculate
power.semantics=calculate

var parser=ISHML.Parser({lexicon:lexicon,grammar:expression}) 

console.log(parser.analyze("18/6/3",{lax:true, greedy:true}))  // 1
console.log(parser.analyze("(1+2)*3+5",{lax:true, greedy:true})) // 14
console.log(parser.analyze("(2^3-3)*4",{lax:true, greedy:true})) // 20