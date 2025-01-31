import { z } from "zod";
import { makeTool, ToolName } from ".";

const zodObj = z.object({
  location: z.string().describe("Only accept New York or California"),
});

export type SearchWeatherProps = z.infer<typeof zodObj>;
export type SearchWeatherReturn = ReturnType<typeof searchWeather>;
export async function* searchWeather(args: SearchWeatherProps) {
  console.log("me called", args);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  if (args.location == "New York") {
    yield {
      done: { weather: "sunny" },
    };
  } else {
    yield {
      done: { weather: "rainy" },
    };
  }
}
export const searchWeatherTool = makeTool({
  name: "searchWeather" as ToolName,
  zodObj: zodObj,
  function: searchWeather,
});
