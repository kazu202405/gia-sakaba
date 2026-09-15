import { Composition } from "remotion";
import {
  GiaStoriesIntro,
  GIA_STORIES_VIDEO_CONFIG,
} from "../components/remotion/gia-stories-video";
import {
  StockSchoolCh1,
  STOCK_SCHOOL_CH1_CONFIG,
} from "../components/remotion/stock-school-ch1";
import {
  StockSeminarDeck,
  STOCK_SEMINAR_DECK_CONFIG,
} from "../components/remotion/stock-seminar-deck";

export const RemotionRoot = () => {
  const stories = GIA_STORIES_VIDEO_CONFIG;
  const stockCh1 = STOCK_SCHOOL_CH1_CONFIG;

  return (
    <>
      <Composition
        id={stories.id}
        component={GiaStoriesIntro}
        durationInFrames={stories.durationInFrames}
        fps={stories.fps}
        width={stories.width}
        height={stories.height}
      />
      <Composition
        id={stockCh1.id}
        component={StockSchoolCh1}
        durationInFrames={stockCh1.durationInFrames}
        fps={stockCh1.fps}
        width={stockCh1.width}
        height={stockCh1.height}
      />
      <Composition
        id={STOCK_SEMINAR_DECK_CONFIG.id}
        component={StockSeminarDeck}
        durationInFrames={STOCK_SEMINAR_DECK_CONFIG.durationInFrames}
        fps={STOCK_SEMINAR_DECK_CONFIG.fps}
        width={STOCK_SEMINAR_DECK_CONFIG.width}
        height={STOCK_SEMINAR_DECK_CONFIG.height}
      />
    </>
  );
};
