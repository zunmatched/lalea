import { describe, expect, it } from "vitest";
import { buildVocabularyQueue, newVocabularyAllowance, normalizeVocabulary } from "./vocabulary";
describe("vocabulary",()=>{
  it("normalizes case, width and whitespace",()=>expect(normalizeVocabulary("  Ｋｅｅｐ   You Posted ")).toBe("keep you posted"));
  it("stops new words under a heavy review load",()=>{expect(newVocabularyAllowance(20)).toBe(0);expect(newVocabularyAllowance(10)).toBe(3);expect(newVocabularyAllowance(2)).toBe(5)});
  it("puts due reviews before new items",()=>{const queue=buildVocabularyQueue([{id:"new",dueAt:null,isNew:true},{id:"due",dueAt:new Date(0),isNew:false}],3);expect(queue.map(x=>x.id)).toEqual(["due","new"])});
});
