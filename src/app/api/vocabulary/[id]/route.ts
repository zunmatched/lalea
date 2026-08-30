import { db } from "@/db/client";
import { userLearningPaths,userVocabulary } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { and,eq } from "drizzle-orm";
import { z } from "zod";

const input=z.object({starred:z.boolean()});

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;
 const parsed=input.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return Response.json({error:"Invalid input"},{status:400});
 const userId=requireUserId();
 const[owned]=await db.select({id:userVocabulary.id}).from(userVocabulary).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).where(and(eq(userVocabulary.id,id),eq(userLearningPaths.userId,userId))).limit(1);
 if(!owned)return Response.json({error:"Not found"},{status:404});
 const[updated]=await db.update(userVocabulary).set({starred:parsed.data.starred}).where(eq(userVocabulary.id,id)).returning({id:userVocabulary.id,starred:userVocabulary.starred});
 return Response.json(updated);
}
