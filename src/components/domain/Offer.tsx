import { router } from "expo-router";
import type { StoreOffer } from "@valhub/domain";
import { ShowcaseCard } from "@/components/ui";
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

export function OfferCard({ offer, width }: Readonly<{ offer: StoreOffer; width: number }>) {
  const { t: tr } = useT();
  const onPress = openOffer(offer);
  return (
    <ShowcaseCard
      width={width}
      imageUri={offer.imageUrl}
      imageAspectRatio={1.7}
      title={offer.name ?? tr("store.newItem")}
      meta={<OfferPrice offer={offer} />}
      {...(onPress ? { onPress } : {})}
    />
  );
}
