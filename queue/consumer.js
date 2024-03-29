const mq = require("amqplib")
const runCode = require("./runner")
const QUEUE_NAME = "CODE"
const fs = require("fs/promises")

const db = require("./db-operation")
db.client.connect().then((val)=>{
  console.log("redis connected");
}).catch(()=>{
  // process.exit(1)
})
const languages = require('./languages')
async function consume() {
  try {
    const connection = await mq.connect("amqp://queue:5672").catch(()=>{
      process.exit(0)
    })
    const channel = await connection.createChannel()
    channel.assertQueue(QUEUE_NAME)
    await channel.consume(QUEUE_NAME, async message => {
      
      const msg = message.content.toString("utf8")
      let sourceCodeInfo = JSON.parse(msg)
      const compilerInfo = sourceCodeInfo.language
      console.log(compilerInfo)
      sourceCodeInfo = {...sourceCodeInfo,...languages[compilerInfo]}
      console.log("received", sourceCodeInfo)
      const id = `${sourceCodeInfo.id}`
      const fileName = `${sourceCodeInfo.id}`
      await db.addToRedis(id, { isCompleted: false })

      const code = sourceCodeInfo.code
      const ext = sourceCodeInfo.extension
      const input = sourceCodeInfo.input
      const compiler = sourceCodeInfo.compiler
      const filePath = `./temp/${fileName}${ext}`
      await fs.writeFile(filePath, code)
      await fs.writeFile(`./temp/${fileName}.txt`, input)

      try {
        let result = await runCode(`sh script.sh ${compiler} ${filePath} ./temp/${fileName}.txt`)
        await db.addToRedis(id,{id:id, output:result.stdout,error:result.stderr,isCompleted:true})
        console.log(result)
      } catch (error) {
        console.log("Error while running",error);
        await db.addToRedis(id,{id:id, output:'',error:error.stderr,isCompleted:true})
      }finally{
        await channel.ack(message)
      }
    })
  } catch (error) {
    console.log("Some error occurred ", error)
  }
}

consume()