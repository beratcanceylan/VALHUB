import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import type { StoreOffer } from "@valhub/domain";
import { ShowcaseCard } from "@/components/ui";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { Price } from "./Price";

const openOffer = (offer: StoreOffer) => (offer.cosmeticId ? () => router.push(`/cosmetics/${offer.cosmeticId}`) : undefined);

export function OfferPrice({ offer }: Readonly<{ offer: Pick<StoreOffer, "cost" | "currency" | "originalCost" | "discountPercent"> }>) {
  return (
    <Price
      cost={offer.cost}
      currency={offer.currency}
      {...(offer.originalCost ? { original: offer.originalCost } : {})}
      {...(offer.discountPercent ? { discount: offer.discountPercent } : {})}
    />
  );
}

export function OfferCard({ offer, index, width }: Readonly<{ offer: StoreOffer; index: number; width: number }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const onPress = openOffer(offer);
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(t.motion.slow)}>
      <ShowcaseCard
        width={width}
        imageUri={offer.imageUrl}
        imageAspectRatio={1.7}
        title={offer.name ?? tr("store.newItem")}
        meta={<OfferPrice offer={offer} />}
        {...(onPress ? { onPress } : {})}
      />
    </Animated.View>
  );
}
