import { expect, test } from "@playwright/test";

test("mobile lesson shows feedback before moving forward", async ({ page }) => {
  const run={id:"20000000-0000-4000-8000-000000000001",currentPosition:0,status:"in_progress",exercises:[{id:"10000000-0000-4000-8000-000000000001",position:1,type:"reading_choice",prompt:"哪一句最適合？",content:{options:[{id:"wrong",text:"Please explain again."},{id:"right",text:"Could you walk me through that?"}]}}]};
  await page.route(/\/api\/unit-runs$/,route=>route.fulfill({json:{id:run.id,resumed:false}}));
  await page.route(new RegExp(`/api/unit-runs/${run.id}$`),route=>route.fulfill({json:run}));
  await page.route("**/api/exercise-attempts",route=>route.fulfill({json:{isCorrect:false,correctIds:["right"],message:"更自然且有禮貌。"}}));
  await page.goto("/");
  await page.getByRole("button",{name:/繼續學習/}).click();
  await page.getByRole("button",{name:"Please explain again."}).click();
  await page.getByRole("button",{name:"確認答案"}).click();
  await expect(page.getByText("再記一次")).toBeVisible();
  await expect(page.getByText("正確答案：Could you walk me through that?")).toBeVisible();
  await expect(page.getByRole("button",{name:"完成短課"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

for(const width of [320,360,390]) test(`${width}px has no horizontal overflow`,async({page})=>{await page.setViewportSize({width,height:700});await page.goto("/");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)});
