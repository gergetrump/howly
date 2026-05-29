import { ActionButton, ActionStack, CardGrid } from '@/components/common';
import { ShopItemCard } from '@/components/cards';
import { CompanionStage } from '@/components/brand';
import { Page, PageSection, Heading } from '@/components/layout';

export function ShopPage() {
    function handleBuyItem(itemId) {
        // Later: send buy request to backend here.
        console.log(`Buy item: ${itemId}`);
    }

    return (
        <Page background="forest">
            <Heading title="Shop" subtitle="Unlock items for your companion." streakDays={100} />
            <CompanionStage name="Howly" mood="shopping" />

            <PageSection title="Accessories">
                <CardGrid columns={3}>
                    <ActionStack>
                        <ShopItemCard name="Cozy Hoodie" category="Outfit" price={300} />
                        <ActionButton type="button" fullWidth onClick={() => handleBuyItem('cozy-hoodie')}>
                            Buy
                        </ActionButton>
                    </ActionStack>
                    <ActionStack>
                        <ShopItemCard name="Moon Collar" category="Accessory" price={180} />
                        <ActionButton type="button" fullWidth onClick={() => handleBuyItem('moon-collar')}>
                            Buy
                        </ActionButton>
                    </ActionStack>
                    <ActionStack>
                        <ShopItemCard name="Reading Glasses" category="Accessory" price={220}/>
                        <ActionButton type="button" fullWidth disabled>
                            Owned
                        </ActionButton>
                    </ActionStack>
                </CardGrid>
            </PageSection>
        </Page>
    );
}
