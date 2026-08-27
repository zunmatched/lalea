import { describe, expect, it } from "vitest";
import { buildVocabularyQueue, normalizeVocabulary } from "./vocabulary";
describe("vocabulary",()=>{
  it("normalizes case, width and whitespace",()=>expect(normalizeVocabulary("  Ｋｅｅｐ   You Posted ")).toBe("keep you posted"));
  it("puts due reviews before new items",()=>{const queue=buildVocabularyQueue([{id:"new",dueAt:null,isNew:true},{id:"due",dueAt:new Date(0),isNew:false}]);expect(queue.map(x=>x.id)).toEqual(["due","new"])});
});
