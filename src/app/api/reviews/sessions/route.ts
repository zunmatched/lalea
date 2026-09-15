import { db } from "@/db/client";
import { userLearningPaths,vocabQuizSessions } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { desc,eq } from "drizzle-orm";
import { z } from "zod";

const categories=["recognize_zh","recognize_en","dictation","spell"] as const;
const input=z.object({
 sourceKey:z.string().min(1),sourceLabel:z.string().min(1),category:z.enum(categories),
 correctCount:z.number().int().min(0),totalCount:z.number().int().min(1),durationSeconds:z.number().int().min(0).optional(),
 wrongForms:z.array(z.object({form:z.string().min(1),translation:z.string().nullable()})).default([]),
});

export async function GET(){
 const userId=requireUserId();
 const[path]=await db.select({id:userLearningPaths.id}).from(userLearningPaths).where(eq(userLearningPaths.userId,userId)).limit(1);
 if(!path)return Response.json({sessions:[]});
 const rows=await db.select().from(vocabQuizSessions).where(eq(vocabQuizSessions.userLearningPathId,path.id)).orderBy(desc(vocabQuizSessions.createdAt)).limit(100);
 return Response.json({sessions:rows});
}

export async function POST(request:Request){
 const parsed=input.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return Response.json({error:"Invalid session"},{status:400});
 const data=parsed.data;
 if(data.correctCount>data.totalCount)return Response.json({error:"Invalid session"},{status:400});
 const userId=requireUserId();
 const[path]=await db.select({id:userLearningPaths.id}).from(userLearningPaths).where(eq(userLearningPaths.userId,userId)).limit(1);
 if(!path)return Response.json({error:"Learning path not found"},{status:404});
 const[created]=await db.insert(vocabQuizSessions).values({userLearningPathId:path.id,sourceKey:data.sourceKey,sourceLabel:data.sourceLabel,category:data.category,correctCount:data.correctCount,totalCount:data.totalCount,durationSeconds:data.durationSeconds,wrongForms:data.wrongForms}).returning();
 return Response.json(created,{status:201});
}
