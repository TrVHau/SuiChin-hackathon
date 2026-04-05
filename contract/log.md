INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING suichin
warning[W10007]: issue with attribute value
    ┌─ ./sources/marketplace.move:105:18
    │
105 │     #[allow(lint(self_transfer))]
    │                  ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
    ┌─ ./sources/marketplace.move:145:18
    │
145 │     #[allow(lint(self_transfer))]
    │                  ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
    ┌─ ./sources/craft.move:270:18
    │
270 │     #[allow(lint(self_transfer))]
    │                  ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
    ┌─ ./sources/craft.move:352:18
    │
352 │     #[allow(lint(self_transfer))]
    │                  ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
   ┌─ ./sources/trade_up.move:75:18
   │
75 │     #[allow(lint(self_transfer))]
   │                  ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

warning[W10007]: issue with attribute value
    ┌─ ./sources/trade_up.move:119:18
    │
119 │     #[allow(lint(self_transfer))]
    │                  ^^^^^^^^^^^^^ Unknown warning filter 'lint(self_transfer)'

Transaction Digest: Ffbd98LStwK5XfDuip5Dbydh2xjkGwSbq7kiGnXSnUrG
╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Data                                                                                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027                                   │
│ Gas Owner: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027                                │
│ Gas Budget: 140790400 MIST                                                                                   │
│ Gas Price: 1000 MIST                                                                                         │
│ Gas Payment:                                                                                                 │
│  ┌──                                                                                                         │
│  │ ID: 0xf14b4b16864f748c051b47dae72a7ff1f8a2aed320fa8c8adc13780081dd1d0e                                    │
│  │ Version: 81                                                                                               │
│  │ Digest: GqLdy23ZgboyB6GZDEaCw396MKDY2zsv8CbVT6zE7DR9                                                      │
│  └──                                                                                                         │
│                                                                                                              │
│ Transaction Kind: Programmable                                                                               │
│ ╭──────────────────────────────────────────────────────────────────────────────────────────────────────────╮ │
│ │ Input Objects                                                                                            │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ 0   Pure Arg: Type: address, Value: "0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027" │ │
│ ╰──────────────────────────────────────────────────────────────────────────────────────────────────────────╯ │
│ ╭─────────────────────────────────────────────────────────────────────────╮                                  │
│ │ Commands                                                                │                                  │
│ ├─────────────────────────────────────────────────────────────────────────┤                                  │
│ │ 0  Publish:                                                             │                                  │
│ │  ┌                                                                      │                                  │
│ │  │ Dependencies:                                                        │                                  │
│ │  │   0x0000000000000000000000000000000000000000000000000000000000000001 │                                  │
│ │  │   0x0000000000000000000000000000000000000000000000000000000000000002 │                                  │
│ │  └                                                                      │                                  │
│ │                                                                         │                                  │
│ │ 1  TransferObjects:                                                     │                                  │
│ │  ┌                                                                      │                                  │
│ │  │ Arguments:                                                           │                                  │
│ │  │   Result 0                                                           │                                  │
│ │  │ Address: Input  0                                                    │                                  │
│ │  └                                                                      │                                  │
│ ╰─────────────────────────────────────────────────────────────────────────╯                                  │
│                                                                                                              │
│ Signatures:                                                                                                  │
│    MjQhbGgbAQOVhy+h7KKXHe+xZcOmKESarfO6GJtX64emHRp8H9PAqpsmOfUuW8aERhaFQq1fO8d1A4yBopM1BQ==                  │
│                                                                                                              │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Effects                                                                               │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Digest: Ffbd98LStwK5XfDuip5Dbydh2xjkGwSbq7kiGnXSnUrG                                              │
│ Status: Success                                                                                   │
│ Executed Epoch: 140                                                                               │
│                                                                                                   │
│ Created Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0x421d31ec3b2f0902be1ebc257dd908be57f08f17747027d012735945ef918953                         │
│  │ Owner: Immutable                                                                               │
│  │ Version: 1                                                                                     │
│  │ Digest: 34qtBUChZW8BAcdzucfnTQawsB5ykd8LGLzKQPLq96it                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x87e4d0d94c428fa3abdf649b6c0b49ec2500a6642a272ac9c330de8b35dbd7bc                         │
│  │ Owner: Shared( 82 )                                                                            │
│  │ Version: 82                                                                                    │
│  │ Digest: CADagDPC6KeP4mPnLVY3MHt5JqCNq2Z5nmT9JycQXTKb                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x9e3ebbd8a59a0b1736914073a01a5d403fdcd082984dcc44caa7b2fc64a5e950                         │
│  │ Owner: Shared( 82 )                                                                            │
│  │ Version: 82                                                                                    │
│  │ Digest: GDqpWiZeoGaD3VSfPM2CvEe4brZH5qsBQYsJ78nwBbAH                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xab3c376c685c14e856eab99b0750a6e6746a0fa307f1ac50220ced4f14996182                         │
│  │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 )  │
│  │ Version: 82                                                                                    │
│  │ Digest: 5aLKorPCdgHjERT9NytJsaqaFqnkqDg2Z4sUoAYZ4b6B                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xb862f5a3da2b0da991812f92f210c077cfd21d67f2d7f538a8065444495587c8                         │
│  │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 )  │
│  │ Version: 82                                                                                    │
│  │ Digest: BEXz5QcCG1eqTtYM4hG83LnuxMtN1C9U2eCHddyUWhf9                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xd832004aca620db84cbb3656d424e1440ace55db4a9ac0387efe19eb8093957d                         │
│  │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 )  │
│  │ Version: 82                                                                                    │
│  │ Digest: 2ByDCq1xGdGGBbTdxk5eC99yQPsE1T6iohMKoeVAmKLp                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xe60173723cc1e2dab18660814702015aa9c97f0c4750bc9448f5b86f7db9faba                         │
│  │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 )  │
│  │ Version: 82                                                                                    │
│  │ Digest: HnmwqbbHA1iURVmS3xgGYD3JqW7aBsuTU9ikiomNLzw3                                           │
│  └──                                                                                              │
│ Mutated Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0xf14b4b16864f748c051b47dae72a7ff1f8a2aed320fa8c8adc13780081dd1d0e                         │
│  │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 )  │
│  │ Version: 82                                                                                    │
│  │ Digest: 6hfPyVGAwfK8VJHyYGdLRsvid1NNhfiSvNH8GjY77Z5J                                           │
│  └──                                                                                              │
│ Gas Object:                                                                                       │
│  ┌──                                                                                              │
│  │ ID: 0xf14b4b16864f748c051b47dae72a7ff1f8a2aed320fa8c8adc13780081dd1d0e                         │
│  │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 )  │
│  │ Version: 82                                                                                    │
│  │ Digest: 6hfPyVGAwfK8VJHyYGdLRsvid1NNhfiSvNH8GjY77Z5J                                           │
│  └──                                                                                              │
│ Gas Cost Summary:                                                                                 │
│    Storage Cost: 138540400 MIST                                                                   │
│    Computation Cost: 1250000 MIST                                                                 │
│    Storage Rebate: 978120 MIST                                                                    │
│    Non-refundable Storage Fee: 9880 MIST                                                          │
│                                                                                                   │
│ Transaction Dependencies:                                                                         │
│    6x1mvXv9oZw88UExHEGvGhgyURG8Wt8zbwXxunaaoT9m                                                   │
│    HVDj8nhCPSqNts2yNQ3ACdyK1GrBueBKc4R2x4HV4a7p                                                   │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Block Events                                                                                                               │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──                                                                                                                                   │
│  │ EventID: Ffbd98LStwK5XfDuip5Dbydh2xjkGwSbq7kiGnXSnUrG:0                                                                             │
│  │ PackageID: 0x421d31ec3b2f0902be1ebc257dd908be57f08f17747027d012735945ef918953                                                       │
│  │ Transaction Module: cuon_chun                                                                                                       │
│  │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027                                                          │
│  │ EventType: 0x2::display::DisplayCreated<0x421d31ec3b2f0902be1ebc257dd908be57f08f17747027d012735945ef918953::cuon_chun::CuonChunNFT> │
│  │ Timestamp: 1775394076426                                                                                                            │
│  └──                                                                                                                                   │
│  │ ParsedJSON:                                                                                                                         │
│  │   ┌────┬────────────────────────────────────────────────────────────────────┐                                                       │
│  │   │ id │ 0xb862f5a3da2b0da991812f92f210c077cfd21d67f2d7f538a8065444495587c8 │                                                       │
│  │   └────┴────────────────────────────────────────────────────────────────────┘                                                       │
│  └──                                                                                                                                   │
│  ┌──                                                                                                                                   │
│  │ EventID: Ffbd98LStwK5XfDuip5Dbydh2xjkGwSbq7kiGnXSnUrG:1                                                                             │
│  │ PackageID: 0x421d31ec3b2f0902be1ebc257dd908be57f08f17747027d012735945ef918953                                                       │
│  │ Transaction Module: cuon_chun                                                                                                       │
│  │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027                                                          │
│  │ EventType: 0x2::display::VersionUpdated<0x421d31ec3b2f0902be1ebc257dd908be57f08f17747027d012735945ef918953::cuon_chun::CuonChunNFT> │
│  │ Timestamp: 1775394076426                                                                                                            │
│  └──                                                                                                                                   │
│  │ ParsedJSON:                                                                                                                         │
│  │   ┌─────────┬──────────┬───────┬─────────────────────────────────────────────────┐                                                  │
│  │   │ fields  │ contents │ key   │ name                                            │                                                  │
│  │   │         │          ├───────┼─────────────────────────────────────────────────┤                                                  │
│  │   │         │          │ value │ {name}                                          │                                                  │
│  │   │         │          ├───────┼─────────────────────────────────────────────────┤                                                  │
│  │   │         │          │ key   │ image_url                                       │                                                  │
│  │   │         │          ├───────┼─────────────────────────────────────────────────┤                                                  │
│  │   │         │          │ value │ {image_url}                                     │                                                  │
│  │   │         │          ├───────┼─────────────────────────────────────────────────┤                                                  │
│  │   │         │          │ key   │ description                                     │                                                  │
│  │   │         │          ├───────┼─────────────────────────────────────────────────┤                                                  │
│  │   │         │          │ value │ Cuon Chun SuiChin - Tier: {tier}                │                                                  │
│  │   │         │          ├───────┼─────────────────────────────────────────────────┤                                                  │
│  │   │         │          │ key   │ project_url                                     │                                                  │
│  │   │         │          ├───────┼─────────────────────────────────────────────────┤                                                  │
│  │   │         │          │ value │ https://github.com/TrVHau/SuiChin-hackathon     │                                                  │
│  │   ├─────────┼──────────┴───────┴─────────────────────────────────────────────────┤                                                  │
│  │   │ id      │ 0xb862f5a3da2b0da991812f92f210c077cfd21d67f2d7f538a8065444495587c8 │                                                  │
│  │   ├─────────┼────────────────────────────────────────────────────────────────────┤                                                  │
│  │   │ version │ 1.0                                                                │                                                  │
│  │   └─────────┴────────────────────────────────────────────────────────────────────┘                                                  │
│  └──                                                                                                                                   │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Object Changes                                                                                                                    │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Created Objects:                                                                                                                  │
│  ┌──                                                                                                                              │
│  │ ObjectID: 0x87e4d0d94c428fa3abdf649b6c0b49ec2500a6642a272ac9c330de8b35dbd7bc                                                   │
│  │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027                                                     │
│  │ Owner: Shared( 82 )                                                                                                            │
│  │ ObjectType: 0x421d31ec3b2f0902be1ebc257dd908be57f08f17747027d012735945ef918953::marketplace::Market                            │
│  │ Version: 82                                                                                                                    │
│  │ Digest: CADagDPC6KeP4mPnLVY3MHt5JqCNq2Z5nmT9JycQXTKb                                                                           │
│  └──                                                                                                                              │
│  ┌──                                                                                                                              │
│  │ ObjectID: 0x9e3ebbd8a59a0b1736914073a01a5d403fdcd082984dcc44caa7b2fc64a5e950                                                   │
│  │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027                                                     │
│  │ Owner: Shared( 82 )                                                                                                            │
│  │ ObjectType: 0x421d31ec3b2f0902be1ebc257dd908be57f08f17747027d012735945ef918953::craft::Treasury                                │
│  │ Version: 82                                                                                                                    │
│  │ Digest: GDqpWiZeoGaD3VSfPM2CvEe4brZH5qsBQYsJ78nwBbAH                                                                           │
│  └──                                                                                                                              │
│  ┌──                                                                                                                              │
│  │ ObjectID: 0xab3c376c685c14e856eab99b0750a6e6746a0fa307f1ac50220ced4f14996182                                                   │
│  │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027                                                     │
│  │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 )                                  │
│  │ ObjectType: 0x421d31ec3b2f0902be1ebc257dd908be57f08f17747027d012735945ef918953::player_profile::MatchOracle                    │
│  │ Version: 82                                                                                                                    │
│  │ Digest: 5aLKorPCdgHjERT9NytJsaqaFqnkqDg2Z4sUoAYZ4b6B                                                                           │
│  └──                                                                                                                              │
│  ┌──                                                                                                                              │
│  │ ObjectID: 0xb862f5a3da2b0da991812f92f210c077cfd21d67f2d7f538a8065444495587c8                                                   │
│  │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027                                                     │
│  │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 )                                  │
│  │ ObjectType: 0x2::display::Display<0x421d31ec3b2f0902be1ebc257dd908be57f08f17747027d012735945ef918953::cuon_chun::CuonChunNFT>  │
│  │ Version: 82                                                                                                                    │
│  │ Digest: BEXz5QcCG1eqTtYM4hG83LnuxMtN1C9U2eCHddyUWhf9                                                                           │
│  └──                                                                                                                              │
│  ┌──                                                                                                                              │
│  │ ObjectID: 0xd832004aca620db84cbb3656d424e1440ace55db4a9ac0387efe19eb8093957d                                                   │
│  │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027                                                     │
│  │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 )                                  │
│  │ ObjectType: 0x2::package::Publisher                                                                                            │
│  │ Version: 82                                                                                                                    │
│  │ Digest: 2ByDCq1xGdGGBbTdxk5eC99yQPsE1T6iohMKoeVAmKLp                                                                           │
│  └──                                                                                                                              │
│  ┌──                                                                                                                              │
│  │ ObjectID: 0xe60173723cc1e2dab18660814702015aa9c97f0c4750bc9448f5b86f7db9faba                                                   │
│  │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027                                                     │
│  │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 )                                  │
│  │ ObjectType: 0x2::package::UpgradeCap                                                                                           │
│  │ Version: 82                                                                                                                    │
│  │ Digest: HnmwqbbHA1iURVmS3xgGYD3JqW7aBsuTU9ikiomNLzw3                                                                           │
│  └──                                                                                                                              │
│ Mutated Objects:                                                                                                                  │
│  ┌──                                                                                                                              │
│  │ ObjectID: 0xf14b4b16864f748c051b47dae72a7ff1f8a2aed320fa8c8adc13780081dd1d0e                                                   │
│  │ Sender: 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027                                                     │
│  │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 )                                  │
│  │ ObjectType: 0x2::coin::Coin<0x2::sui::SUI>                                                                                     │
│  │ Version: 82                                                                                                                    │
│  │ Digest: 6hfPyVGAwfK8VJHyYGdLRsvid1NNhfiSvNH8GjY77Z5J                                                                           │
│  └──                                                                                                                              │
│ Published Objects:                                                                                                                │
│  ┌──                                                                                                                              │
│  │ PackageID: 0x421d31ec3b2f0902be1ebc257dd908be57f08f17747027d012735945ef918953                                                  │
│  │ Version: 1                                                                                                                     │
│  │ Digest: 34qtBUChZW8BAcdzucfnTQawsB5ykd8LGLzKQPLq96it                                                                           │
│  │ Modules: achievement, craft, cuon_chun, marketplace, player_profile, scrap, trade_up                                           │
│  └──                                                                                                                              │
╰───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Balance Changes                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──                                                                                              │
│  │ Owner: Account Address ( 0xb7c3fff63ddde0174d510c5a03ffa2085e940536e2ff8806cb3475f4f6fd6027 )  │
│  │ CoinType: 0x2::sui::SUI                                                                        │
│  │ Amount: -138812280                                                                             │
│  └──                                                                                              │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
