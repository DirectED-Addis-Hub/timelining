(()=>{var e={};e.id=750,e.ids=[750],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},1204:e=>{"use strict";e.exports=require("string_decoder")},1540:(e,t,i)=>{"use strict";i.r(t),i.d(t,{patchFetch:()=>E,routeModule:()=>v,serverHooks:()=>T,workAsyncStorage:()=>I,workUnitAsyncStorage:()=>y});var o={};i.r(o),i.d(o,{GET:()=>g,POST:()=>f});var r=i(612),s=i(5705),n=i(4336),a=i(8285),d=i(7454),p=i(5784);async function l(e){let t=(await (0,p.Tr)()).session({database:"neo4j"});a.v.debug(e);try{let i=await t.writeTransaction(async t=>{let i=`
        MERGE (p:Participant {handle: $senderHandle})
        MERGE (c:TelegramChat {id: $chatId})
        ON CREATE SET 
          c.firstName = $chatFirstName,
          c.username = $chatUsername,
          c.type = $chatType
        CREATE (e:Entry {
          id: randomUUID(),
          updateId: $updateId,
          messageId: $messageId,
          date: datetime($date)
        })-[:SENT_BY]->(p)

        MERGE (e)-[:FROM_CHAT]->(c)

        WITH e, p, c

        ${e.textContent?`
        CREATE (t:TextContent {id: randomUUID(), text: $text})
        MERGE (e)-[:HAS_TEXT]->(t)
        WITH e, p, c
        `:""}

        ${e.captionContent?`
        CREATE (cap:CaptionContent {id: randomUUID(), caption: $caption})
        MERGE (e)-[:HAS_CAPTION]->(cap)
        WITH e, p, c
        `:""}

        ${e.entities?.length>0?`
        UNWIND range(0, size($entityOffsets) - 1) AS idxEntity
        CREATE (en:Entity {
          id: randomUUID(),
          offset: $entityOffsets[idxEntity],
          length: $entityLengths[idxEntity],
          type: $entityTypes[idxEntity]
        })
        MERGE (e)-[:HAS_ENTITY]->(en)
        WITH e, p, c
        `:""}

        ${e.photos?.length>0?`
          WITH e, p, c,
            size($photoFileIds) - 1 AS lastIdx
          CREATE (pht:Photo {
            id: randomUUID(),
            fileId: $photoFileIds[lastIdx],
            fileUniqueId: $photoFileUniqueIds[lastIdx],
            fileSize: $photoFileSizes[lastIdx],
            width: $photoWidths[lastIdx],
            height: $photoHeights[lastIdx]
          })
          MERGE (e)-[:HAS_PHOTO]->(pht)
          WITH e, p, c
          `:""}

        ${e.voice?`
        CREATE (vn:Voice {
          id: randomUUID(),
          fileId: $voiceFileId,
          fileUniqueId: $voiceFileUniqueId,
          fileSize: $voiceFileSize,
          duration: $voiceDuration,
          mimeType: $voiceMimeType
        })
        MERGE (e)-[:HAS_VOICE]->(vn)
        WITH e, p, c
        `:""}

        ${e.videos?.length>0?`
        UNWIND range(0, size($videoFileIds) - 1) AS idxVideo
        CREATE (vid:Video {
          id: randomUUID(),
          duration: $videoDurations[idxVideo],
          width: $videoWidths[idxVideo],
          height: $videoHeights[idxVideo],
          mimeType: $videoMimeTypes[idxVideo],
          fileId: $videoFileIds[idxVideo],
          fileUniqueId: $videoFileUniqueIds[idxVideo],
          fileSize: $videoFileSizes[idxVideo]
        })
        MERGE (e)-[:HAS_VIDEO]->(vid)
        WITH e, p, c
        `:""}

        ${e.videoNote?`
        CREATE (vidnote:VideoNote {
          id: randomUUID(),
          duration: $videoNoteDuration,
          length: $videoNoteLength,
          fileId: $videoNoteFileId,
          fileUniqueId: $videoNoteFileUniqueId,
          fileSize: $videoNoteFileSize
        })
        MERGE (e)-[:HAS_VIDEO_NOTE]->(vidnote)
        WITH e, p, c
        `:""}

        ${e.replyTo?`
        MATCH (repliedTo:Entry {messageId: $replyToMessageId})
        MERGE (e)-[:REPLIED_TO]->(repliedTo)
        `:""}

        RETURN e.id AS id
      `,o={senderHandle:e.participant.handle,chatId:e.chat.id,chatFirstName:e.chat.firstName,chatUsername:e.chat.username,chatType:e.chat.type,updateId:e.entry.updateId,messageId:e.entry.messageId,date:e.entry.date,text:e.textContent?.text,replyToMessageId:e.replyTo?.messageId,caption:e.captionContent?.caption,entityOffsets:e.entities.map(e=>e.offset),entityLengths:e.entities.map(e=>e.length),entityTypes:e.entities.map(e=>e.type),photoFileIds:e.photos.map(e=>e.fileId),photoFileUniqueIds:e.photos.map(e=>e.fileUniqueId),photoFileSizes:e.photos.map(e=>e.fileSize),photoWidths:e.photos.map(e=>e.width),photoHeights:e.photos.map(e=>e.height),voiceFileId:e.voice?.fileId,voiceFileUniqueId:e.voice?.fileUniqueId,voiceFileSize:e.voice?.fileSize,voiceDuration:e.voice?.duration,voiceMimeType:e.voice?.mimeType,videoFileIds:e.videos.map(e=>e.fileId),videoFileUniqueIds:e.videos.map(e=>e.fileUniqueId),videoFileSizes:e.videos.map(e=>e.fileSize),videoDurations:e.videos.map(e=>e.duration),videoWidths:e.videos.map(e=>e.width),videoHeights:e.videos.map(e=>e.height),videoMimeTypes:e.videos.map(e=>e.mimeType),videoNoteDuration:e.videoNote?.duration,videoNoteLength:e.videoNote?.length,videoNoteFileId:e.videoNote?.fileId,videoNoteFileUniqueId:e.videoNote?.fileUniqueId,videoNoteFileSize:e.videoNote?.fileSize},r=await t.run(i,o);return a.v.info(r.summary.counters.updates()),a.v.debug("Cypher executed",{query:i,params:o,resultSummary:r.summary}),r});if(!i.records.length)throw a.v.error("No records returned!",{resultSummary:i.summary}),Error("No records returned from database.");return i.records[0].get("id")}catch(e){throw a.v.error("Error creating entry node:",e),e}}async function c(e){var t,i,o,r,s,n,d;let l=(0,p.vZ)().session();a.v.info(`Getting entry node for id ${e}`);let c=(await l.run(`
    MATCH (e:Entry {id: $entryId}) 
    OPTIONAL MATCH (e)-[:SENT_BY]->(p:Participant)
    OPTIONAL MATCH (e)-[:FROM_CHAT]->(c:TelegramChat)
    OPTIONAL MATCH (e)-[:HAS_TEXT]->(t:TextContent)
    OPTIONAL MATCH (e)-[:HAS_CAPTION]->(cap:CaptionContent)
    OPTIONAL MATCH (e)-[:HAS_ENTITY]->(en:Entity)
    OPTIONAL MATCH (e)-[:HAS_PHOTO]->(pht:Photo)
    OPTIONAL MATCH (e)-[:HAS_VOICE]->(vn:Voice)
    OPTIONAL MATCH (e)-[:HAS_VIDEO]->(vid:Video)
    OPTIONAL MATCH (e)-[:HAS_VIDEO_NOTE]->(vidnote:VideoNote)
    RETURN e, p, c, t, cap, collect(en) as entities, collect(pht) as photos, vn, collect(vid) as videos, vidnote
    `,{entryId:e})).records[0];return{entry:{id:(t=c.get("e")).properties.id,updateId:t.properties.updateId,messageId:t.properties.messageId,date:t.properties.date},participant:{handle:c.get("p").properties.handle},chat:{id:(i=c.get("c")).properties.id,type:i.properties.type,firstName:i.properties.firstName,username:i.properties.username},textContent:c.get("t")?{id:(o=c.get("t")).properties.id,text:o.properties.text}:void 0,captionContent:c.get("cap")?{id:(r=c.get("cap")).properties.id,caption:r.properties.caption}:void 0,entities:c.get("entities")?(s=c.get("entities"),a.v.info(s),s.map(e=>({id:e.properties.id,offset:e.properties.offset,length:e.properties.length,type:e.properties.type}))):[],photos:c.get("photos")?c.get("photos").map(e=>({id:e.properties.id,fileId:e.properties.fileId,fileUniqueId:e.properties.fileUniqueId,fileSize:e.properties.fileSize,width:e.properties.width,height:e.properties.height})):[],voice:c.get("vn")?{id:(n=c.get("vn")).properties.id,fileId:n.properties.fileId,fileUniqueId:n.properties.fileUniqueId,fileSize:n.properties.fileSize,duration:n.properties.duration,mimeType:n.properties.mimeType}:void 0,videos:c.get("videos")?c.get("videos").map(e=>({id:e.properties.id,duration:e.properties.duration,width:e.properties.width,height:e.properties.height,mimeType:e.properties.mimeType,fileId:e.properties.fileId,fileUniqueId:e.properties.fileUniqueId,fileSize:e.properties.fileSize})):[],videoNote:c.get("vidnote")?{id:(d=c.get("vidnote")).properties.id,duration:d.properties.duration,length:d.properties.length,fileId:d.properties.fileId,fileUniqueId:d.properties.fileUniqueId,fileSize:d.properties.fileSize}:void 0}}async function u(e){let t,i;try{t=function(e){if(!e.message||!e.message.chat)throw Error("Invalid Telegram message: missing message or chat.");let t=e.message.video;return{entry:{updateId:e.update_id,messageId:e.message.message_id,date:new Date(1e3*e.message.date).toISOString()},participant:{handle:e.message.from?.username||String(e.message.from?.id)||"unknown"},chat:{id:e.message.chat.id,firstName:e.message.chat.first_name,username:e.message.chat.username,type:e.message.chat.type},textContent:e.message.text?{text:e.message.text}:void 0,captionContent:e.message.caption?{caption:e.message.caption}:void 0,entities:e.message.entities?.map(e=>({offset:e.offset,length:e.length,type:e.type}))||[],photos:e.message.photo?Array.isArray(e.message.photo)?e.message.photo.map(e=>({fileId:e.file_id,fileUniqueId:e.file_unique_id,fileSize:e.file_size,width:e.width,height:e.height})):[{fileId:e.message.photo.file_id,fileUniqueId:e.message.photo.file_unique_id,fileSize:e.message.photo.file_size,width:e.message.photo.width,height:e.message.photo.height}]:[],voice:e.message.voice?{fileId:e.message.voice.file_id,fileUniqueId:e.message.voice.file_unique_id,fileSize:e.message.voice.file_size,duration:e.message.voice.duration,mimeType:e.message.voice.mime_type}:void 0,videos:t?Array.isArray(t)?t.map(e=>({duration:e.duration,width:e.width,height:e.height,mimeType:e.mime_type,fileId:e.file_id,fileUniqueId:e.file_unique_id,fileSize:e.file_size})):[{duration:t.duration,width:t.width,height:t.height,mimeType:t.mime_type,fileId:t.file_id,fileUniqueId:t.file_unique_id,fileSize:t.file_size}]:[],videoNote:e.message.video_note?{fileId:e.message.video_note.file_id,fileUniqueId:e.message.video_note.file_unique_id,fileSize:e.message.video_note.file_size,duration:e.message.video_note.duration,length:e.message.video_note.length}:void 0}}(e)}catch(e){throw a.v.error("Failed to create full entry data object:",e),e}let o=function(e){let t={};if(e.replyTo&&(t.reply=e.replyTo.messageId),e.textContent&&(t.textContent=1),e.captionContent&&(t.captionContent=1),e.entities?.length>0&&(t.entities=e.entities.length),e.photos?.length>0&&(t.photos=1),e.voice&&(t.voice=1),e.videos?.length>0&&(t.videos=e.videos.length),e.videoNote&&(t.videoNote=1),Object.keys(t).length){let e="Creating and linking the following optional nodes and relationships (in addition to entry, participant, and chat):"+Object.entries(t).map(([e,t])=>`${e}: ${t}`).join(", ");a.v.info(e)}return t}(t);try{i=await l(t);let e=await c(i);!function(e,t){let i={entry:+!!t.entry,participant:+!!t.participant,chat:+!!t.chat,textContent:+!!t.textContent,captionContent:+!!t.captionContent,entities:t.entities?.length??0,photos:t.photos?.length??0,voice:+!!t.voice,videos:t.videos?.length??0,videoNote:+!!t.videoNote},o=!0,r=[];for(let[t,s]of Object.entries(e)){let e=i[t]??0,n=Number(s);e!==n&&(o=!1),r.push(`${t}: expected ${n}, got ${e}`)}if(!o)throw a.v.error("Database entry did not match expectations",{comparison:r.join(", "),expected:e,actual:i}),Error(`Database mismatch:
${r.join(", ")}`);a.v.info("Success!")}(o,e)}catch(e){if(e instanceof Error)throw a.v.error("Entry write failed: "+e.message),e;throw a.v.error("Entry write failed with non-Error object:",e),Error("Unknown error occurred during entry write.")}return i}async function m(){let e,t=Date.now(),i=0,o=0;try{for(let r=0;r<10;r++){if(Date.now()-t>8e3){a.v.info("Approaching execution timeout, stopping batch");break}let r=await d.Y.lpop("telegram_messages");if(!r){a.v.info("No message received from Redis.");break}try{let t=await u(r);t?(a.v.info("Wrote message metadata to db"),i++,await d.Y.lpush("timeline_entry",t),e=void 0):(o++,await d.Y.rpush("telegram_messages",r))}catch(t){if(a.v.error("Unexpected error during processing:",{error:t}),o++,e===r.message?.message_id){a.v.warn("Detected repeated failure on same message. Stopping worker to avoid loop."),await d.Y.rpush("telegram_messages",r);break}e=r.message?.message_id,await d.Y.rpush("telegram_messages",r)}}let r=await d.Y.llen("telegram_messages");return a.v.info("Queue status:",{remainingCount:r,currentProcessed:i,failed:o}),{status:"success",message:`Processed ${i} messages, ${o} failed`,processed_count:i,remaining_count:r}}catch(t){let e=t instanceof Error?t.message:"Unknown error occurred";return a.v.error("Worker execution failed:",{error:e}),{status:"error",message:e,processed_count:i}}}var h=i(621);async function g(){a.v.info("Cron job triggered.");try{let e=await m();return a.v.info("Worker result",{result:e}),h.NextResponse.json({status:"Worker executed",result:e})}catch(e){if(e instanceof Error)return h.NextResponse.json({error:e.message},{status:500});return h.NextResponse.json({error:"Unknown error occurred"},{status:500})}}async function f(){return new h.NextResponse("Method Not Allowed",{status:405})}let v=new r.AppRouteRouteModule({definition:{kind:s.RouteKind.APP_ROUTE,page:"/api/story/worker/route",pathname:"/api/story/worker",filename:"route",bundlePath:"app/api/story/worker/route"},resolvedPagePath:"C:\\Users\\Tobias Fechner\\Documents\\2_Work\\prisma\\timelining\\src\\app\\api\\story\\worker\\route.ts",nextConfigOutput:"standalone",userland:o}),{workAsyncStorage:I,workUnitAsyncStorage:y,serverHooks:T}=v;function E(){return(0,n.patchFetch)({workAsyncStorage:I,workUnitAsyncStorage:y})}},1630:e=>{"use strict";e.exports=require("http")},1645:e=>{"use strict";e.exports=require("net")},1820:e=>{"use strict";e.exports=require("os")},2786:()=>{},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},3873:e=>{"use strict";e.exports=require("path")},4075:e=>{"use strict";e.exports=require("zlib")},4631:e=>{"use strict";e.exports=require("tls")},4735:e=>{"use strict";e.exports=require("events")},4870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4985:e=>{"use strict";e.exports=require("dns")},5511:e=>{"use strict";e.exports=require("crypto")},5591:e=>{"use strict";e.exports=require("https")},5784:(e,t,i)=>{"use strict";let o;i.d(t,{Tr:()=>l,vZ:()=>p});var r=i(3778),s=i(8285);let n=process.env.NEO4J_URI||"bolt://localhost:7687",a=process.env.NEO4J_USERNAME||"neo4j",d=process.env.NEO4J_PASSWORD||"neo4jtesting";function p(){return o||(s.v.info(`Connecting to Neo4j at ${n} with user ${a}`),o=r.Ay.driver(n,r.Ay.auth.basic(a,d))),o}async function l(){s.v.info("Initializing Neo4j connection...");let e=p();try{s.v.info("Verifying connection to Neo4j...");let t=await e.verifyConnectivity();return s.v.info("Server Info:",t),e}catch(t){throw s.v.error(`Failed to initialize Neo4j driver: ${t instanceof Error?t.message:"Unknown error"}`),await e.close(),t}}},7454:(e,t,i)=>{"use strict";i.d(t,{Y:()=>o});let o=new(i(7876)).Q({url:process.env.KV_REST_API_URL,token:process.env.KV_REST_API_TOKEN})},7910:e=>{"use strict";e.exports=require("stream")},8285:(e,t,i)=>{"use strict";i.d(t,{v:()=>r});var o=i(7911);let r=(0,o.createLogger)({level:"info",format:o.format.combine(o.format.timestamp(),o.format.json()),transports:[new o.transports.Console]})},8354:e=>{"use strict";e.exports=require("util")},8506:()=>{},9021:e=>{"use strict";e.exports=require("fs")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},9428:e=>{"use strict";e.exports=require("buffer")}};var t=require("../../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),o=t.X(0,[877,911,778,876],()=>i(1540));module.exports=o})();