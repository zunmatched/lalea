"use client";
import { useRouter } from "next/navigation";
import { VocabularyPanel } from "@/components/vocabulary-panel";
export default function VocabularyPage(){const router=useRouter();return <VocabularyPanel onBack={()=>router.push("/")}/>}
