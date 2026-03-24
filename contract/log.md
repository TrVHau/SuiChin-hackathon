dau@DESKTOP-DAU2K5:/mnt/c/code/blockchain/SuiChin-hackathon/contract$ sui client test-publish --build-env testnet
[
INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING suichin
warning[W10007]: issue with attribute value
┌─ ./sources/marketplace.move:105:18
│
105 │ #[allow(lint(self_transfer))]
│ ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
┌─ ./sources/marketplace.move:145:18
│
145 │ #[allow(lint(self_transfer))]
│ ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
┌─ ./sources/trade_up.move:75:18
│
75 │ #[allow(lint(self_transfer))]
│ ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
┌─ ./sources/trade_up.move:119:18
│
119 │ #[allow(lint(self_transfer))]
│ ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
┌─ ./sources/craft.move:129:18
│
129 │ #[allow(lint(self_transfer))]
│ ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
┌─ ./sources/craft.move:194:18
│
194 │ #[allow(lint(self_transfer))]
│ ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

Transaction Digest: GnWuB4TgxUKbccaa6ite8V9A1h88wrAGSGFkFiUPNd7X
╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Data │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ Gas Owner: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ Gas Budget: 125719200 MIST │
│ Gas Price: 1000 MIST │
│ Gas Payment: │
│ ┌── │
│ │ ID: 0xf36f0e3b880e8bf562fa387798d843123b31c2eca4162ec9acdc298e4f4d5766 │
│ │ Version: 4 │
│ │ Digest: 9cTMEy9X5YmMgFkxYy9vdTuAwLoLn7QdaPwNbjb3rTVX │
│ └── │
│ │
│ Transaction Kind: Programmable │
│ ╭──────────────────────────────────────────────────────────────────────────────────────────────────────────╮ │
│ │ Input Objects │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ 0 Pure Arg: Type: address, Value: "0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027" │ │
│ ╰──────────────────────────────────────────────────────────────────────────────────────────────────────────╯ │
│ ╭─────────────────────────────────────────────────────────────────────────╮ │
│ │ Commands │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ 0 Publish: │ │
│ │ ┌ │ │
│ │ │ Dependencies: │ │
│ │ │ 0x0000000000000000000000000000000000000000000000000000000000000001 │ │
│ │ │ 0x0000000000000000000000000000000000000000000000000000000000000002 │ │
│ │ └ │ │
│ │ │ │
│ │ 1 TransferObjects: │ │
│ │ ┌ │ │
│ │ │ Arguments: │ │
│ │ │ Result 0 │ │
│ │ │ Address: Input 0 │ │
│ │ └ │ │
│ ╰─────────────────────────────────────────────────────────────────────────╯ │
│ │
│ Signatures: │
│ KkrzMnw4enwI3F4uYGaSvSt0Kh220D7IJpeGDB6aP9I+PbSpuneSZsIxJkFiHst16mmlt13iBH5hXBjflzeBCA== │
│ │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Effects │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Digest: GnWuB4TgxUKbccaa6ite8V9A1h88wrAGSGFkFiUPNd7X │
│ Status: Success │
│ Executed Epoch: 15 │
│ │
│ Created Objects: │
│ ┌── │
│ │ ID: 0x0be9f915f6040a80dceb956e78ac7e887ac0a7e6f070ab551716b7f7743a3d69 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 5 │
│ │ Digest: 535jViZZVvXp35SLf1FKebMsiaacG55TG4HzPUMbgpiB │
│ └── │
│ ┌── │
│ │ ID: 0x40bd67bb56be3f6f8a531f88bc01515a208d795e62c351e65fe35d067aac6d31 │
│ │ Owner: Immutable │
│ │ Version: 1 │
│ │ Digest: 2orxA2SfG5cYQ6Jy3osbBT436UsBkpQXTUasEVfJe5Cf │
│ └── │
│ ┌── │
│ │ ID: 0x57a12a6ce7891cd8c6325bcb1b867d1038f70830fccbcfa485fa6f2eaf138408 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 5 │
│ │ Digest: 8vcr7YndWFYL42SdmuZXM98GaNfZC3SAZLs18gpFYQtb │
│ └── │
│ ┌── │
│ │ ID: 0x6b1cae614a79b14530a96e66bdc2a9262895e4ff13e75fd3e22055cbd92ce343 │
│ │ Owner: Shared( 5 ) │
│ │ Version: 5 │
│ │ Digest: 6KBcFHhn9EpM86P8rjN8jv3UWUP4DzfWp5Fa9HU4JByo │
│ └── │
│ ┌── │
│ │ ID: 0x72d677c4fbf9395e71b73f181d20f7c337c599ac489b00518ffa0699c5009971 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 5 │
│ │ Digest: C8sDSj79cPH6cAW5xtRadU9kLE152XQ7UF28QBZhKSVf │
│ └── │
│ ┌── │
│ │ ID: 0xb3527aaff13da00d2a36ef1bf84fc3532da53dbc5ed13de73c028f9186984b95 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 5 │
│ │ Digest: 36Fj1JjwpVvC2WsMxNhVjSRjamvHGPq75rrHm4a7pDDJ │
│ └── │
│ ┌── │
│ │ ID: 0xb91342b2b37ed7627c8538805780a5ddaf4bed2dffc3a33cb50785220117f64c │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 5 │
│ │ Digest: GFTGRkvXz9xABrsuur25yvEdXVEfYDkBKNSCjPA6Chbj │
│ └── │
│ ┌── │
│ │ ID: 0xe2896691594890ba7cf50bfcca00e3f987bd84047d621a5ba7ae2e738f1645dc │
│ │ Owner: Shared( 5 ) │
│ │ Version: 5 │
│ │ Digest: 7eS2R1QXu5wUkjGUt627d2mkFPi9Nb27j9PfnGdjQ3nf │
│ └── │
│ Mutated Objects: │
│ ┌── │
│ │ ID: 0xf36f0e3b880e8bf562fa387798d843123b31c2eca4162ec9acdc298e4f4d5766 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 5 │
│ │ Digest: 5fX5b8UUQrXGFpTcAZ4ZjedFM6xmzZi8fTRhbKaFYHXC │
│ └── │
│ Gas Object: │
│ ┌── │
│ │ ID: 0xf36f0e3b880e8bf562fa387798d843123b31c2eca4162ec9acdc298e4f4d5766 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ Version: 5 │
│ │ Digest: 5fX5b8UUQrXGFpTcAZ4ZjedFM6xmzZi8fTRhbKaFYHXC │
│ └── │
│ Gas Cost Summary: │
│ Storage Cost: 123629200 MIST │
│ Computation Cost: 1090000 MIST │
│ Storage Rebate: 978120 MIST │
│ Non-refundable Storage Fee: 9880 MIST │
│ │
│ Transaction Dependencies: │
│ 2aTLvAKHFSxg4C6xp4yCkgZuTAYTEui5TfJsXegGnAvu │
│ 7bosHaCyC2TWe6MCmK9KJcQch17y7h9NWJeiP9GvGeY9 │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Block Events │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌── │
│ │ EventID: GnWuB4TgxUKbccaa6ite8V9A1h88wrAGSGFkFiUPNd7X:0 │
│ │ PackageID: 0x40bd67bb56be3f6f8a531f88bc01515a208d795e62c351e65fe35d067aac6d31 │
│ │ Transaction Module: cuon_chun │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ EventType: 0x2::display::DisplayCreated<0x40bd67bb56be3f6f8a531f88bc01515a208d795e62c351e65fe35d067aac6d31::cuon_chun::CuonChunNFT> │
│ │ Timestamp: 1774344944631 │
│ └── │
│ │ ParsedJSON: │
│ │ ┌────┬────────────────────────────────────────────────────────────────────┐ │
│ │ │ id │ 0xb91342b2b37ed7627c8538805780a5ddaf4bed2dffc3a33cb50785220117f64c │ │
│ │ └────┴────────────────────────────────────────────────────────────────────┘ │
│ └── │
│ ┌── │
│ │ EventID: GnWuB4TgxUKbccaa6ite8V9A1h88wrAGSGFkFiUPNd7X:1 │
│ │ PackageID: 0x40bd67bb56be3f6f8a531f88bc01515a208d795e62c351e65fe35d067aac6d31 │
│ │ Transaction Module: cuon_chun │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ EventType: 0x2::display::VersionUpdated<0x40bd67bb56be3f6f8a531f88bc01515a208d795e62c351e65fe35d067aac6d31::cuon_chun::CuonChunNFT> │
│ │ Timestamp: 1774344944631 │
│ └── │
│ │ ParsedJSON: │
│ │ ┌─────────┬──────────┬───────┬─────────────────────────────────────────────────┐ │
│ │ │ fields │ contents │ key │ name │ │
│ │ │ │ ├───────┼─────────────────────────────────────────────────┤ │
│ │ │ │ │ value │ {name} │ │
│ │ │ │ ├───────┼─────────────────────────────────────────────────┤ │
│ │ │ │ │ key │ image_url │ │
│ │ │ │ ├───────┼─────────────────────────────────────────────────┤ │
│ │ │ │ │ value │ {image_url} │ │
│ │ │ │ ├───────┼─────────────────────────────────────────────────┤ │
│ │ │ │ │ key │ description │ │
│ │ │ │ ├───────┼─────────────────────────────────────────────────┤ │
│ │ │ │ │ value │ Cuon Chun SuiChin - Tier: {tier} │ │
│ │ │ │ ├───────┼─────────────────────────────────────────────────┤ │
│ │ │ │ │ key │ project_url │ │
│ │ │ │ ├───────┼─────────────────────────────────────────────────┤ │
│ │ │ │ │ value │ https://github.com/TrVHau/SuiChin-hackathon │ │
│ │ ├─────────┼──────────┴───────┴─────────────────────────────────────────────────┤ │
│ │ │ id │ 0xb91342b2b37ed7627c8538805780a5ddaf4bed2dffc3a33cb50785220117f64c │ │
│ │ ├─────────┼────────────────────────────────────────────────────────────────────┤ │
│ │ │ version │ 1.0 │ │
│ │ └─────────┴────────────────────────────────────────────────────────────────────┘ │
│ └── │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Object Changes │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Created Objects: │
│ ┌── │
│ │ ObjectID: 0x0be9f915f6040a80dceb956e78ac7e887ac0a7e6f070ab551716b7f7743a3d69 │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ ObjectType: 0x2::package::UpgradeCap │
│ │ Version: 5 │
│ │ Digest: 535jViZZVvXp35SLf1FKebMsiaacG55TG4HzPUMbgpiB │
│ └── │
│ ┌── │
│ │ ObjectID: 0x57a12a6ce7891cd8c6325bcb1b867d1038f70830fccbcfa485fa6f2eaf138408 │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ ObjectType: 0x40bd67bb56be3f6f8a531f88bc01515a208d795e62c351e65fe35d067aac6d31::craft::AdminCap │
│ │ Version: 5 │
│ │ Digest: 8vcr7YndWFYL42SdmuZXM98GaNfZC3SAZLs18gpFYQtb │
│ └── │
│ ┌── │
│ │ ObjectID: 0x6b1cae614a79b14530a96e66bdc2a9262895e4ff13e75fd3e22055cbd92ce343 │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Shared( 5 ) │
│ │ ObjectType: 0x40bd67bb56be3f6f8a531f88bc01515a208d795e62c351e65fe35d067aac6d31::craft::Treasury │
│ │ Version: 5 │
│ │ Digest: 6KBcFHhn9EpM86P8rjN8jv3UWUP4DzfWp5Fa9HU4JByo │
│ └── │
│ ┌── │
│ │ ObjectID: 0x72d677c4fbf9395e71b73f181d20f7c337c599ac489b00518ffa0699c5009971 │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ ObjectType: 0x40bd67bb56be3f6f8a531f88bc01515a208d795e62c351e65fe35d067aac6d31::player_profile::MatchOracle │
│ │ Version: 5 │
│ │ Digest: C8sDSj79cPH6cAW5xtRadU9kLE152XQ7UF28QBZhKSVf │
│ └── │
│ ┌── │
│ │ ObjectID: 0xb3527aaff13da00d2a36ef1bf84fc3532da53dbc5ed13de73c028f9186984b95 │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ ObjectType: 0x2::package::Publisher │
│ │ Version: 5 │
│ │ Digest: 36Fj1JjwpVvC2WsMxNhVjSRjamvHGPq75rrHm4a7pDDJ │
│ └── │
│ ┌── │
│ │ ObjectID: 0xb91342b2b37ed7627c8538805780a5ddaf4bed2dffc3a33cb50785220117f64c │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ ObjectType: 0x2::display::Display<0x40bd67bb56be3f6f8a531f88bc01515a208d795e62c351e65fe35d067aac6d31::cuon_chun::CuonChunNFT> │
│ │ Version: 5 │
│ │ Digest: GFTGRkvXz9xABrsuur25yvEdXVEfYDkBKNSCjPA6Chbj │
│ └── │
│ ┌── │
│ │ ObjectID: 0xe2896691594890ba7cf50bfcca00e3f987bd84047d621a5ba7ae2e738f1645dc │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Shared( 5 ) │
│ │ ObjectType: 0x40bd67bb56be3f6f8a531f88bc01515a208d795e62c351e65fe35d067aac6d31::marketplace::Market │
│ │ Version: 5 │
│ │ Digest: 7eS2R1QXu5wUkjGUt627d2mkFPi9Nb27j9PfnGdjQ3nf │
│ └── │
│ Mutated Objects: │
│ ┌── │
│ │ ObjectID: 0xf36f0e3b880e8bf562fa387798d843123b31c2eca4162ec9acdc298e4f4d5766 │
│ │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ ObjectType: 0x2::coin::Coin<0x2::sui::SUI> │
│ │ Version: 5 │
│ │ Digest: 5fX5b8UUQrXGFpTcAZ4ZjedFM6xmzZi8fTRhbKaFYHXC │
│ └── │
│ Published Objects: │
│ ┌── │
│ │ PackageID: 0x40bd67bb56be3f6f8a531f88bc01515a208d795e62c351e65fe35d067aac6d31 │
│ │ Version: 1 │
│ │ Digest: 2orxA2SfG5cYQ6Jy3osbBT436UsBkpQXTUasEVfJe5Cf │
│ │ Modules: achievement, craft, cuon_chun, marketplace, player_profile, scrap, trade_up │
│ └── │
╰───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Balance Changes │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌── │
│ │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 ) │
│ │ CoinType: 0x2::sui::SUI │
│ │ Amount: -123741080 │
│ └── │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
-bash: [: missing `]'
dau@DESKTOP-DAU2K5:/mnt/c/code/blockchain/SuiChin-hackathon/contract$
