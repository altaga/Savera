import {Image} from 'react-native';
import HBAR from '../assets/logos/hbar.png';
import USDC from '../assets/logos/usdc.png';

const w = 50;
const h = 50;

export const refreshRate = 1000 * 60;

export const iconsBlockchain = {
  hbar: (
    <Image
      source={HBAR}
      style={{
        width: w,
        height: h,
        borderRadius: w,
        resizeMode: 'contain',
        borderColor: 'gray',
        borderWidth: 1,
      }}
    />
  ),
  usdc: (
    <Image
      source={USDC}
      style={{
        width: w,
        height: h,
        borderRadius: w,
        resizeMode: 'contain',
        borderColor: 'gray',
        borderWidth: 1,
      }}
    />
  ),
};

export const blockchain = {
  network: 'Hedera',
  token: 'HBAR',
  blockExplorer: 'https://hashscan.io/mainnet/',
  iconSymbol: 'hbar',
  decimals: 8,
  tokens: [
    // Updated April/19/2024
    {
      name: 'Hedera',
      symbol: 'HBAR',
      tokenId: '0.0.000000',
      decimals: 8,
      icon: iconsBlockchain.hbar,
      coingecko: 'hedera-hashgraph',
    },
    {
      name: 'USD Coin',
      symbol: 'USDC',
      tokenId: '0.0.456858',
      decimals: 6,
      icon: iconsBlockchain.usdc,
      coingecko: 'usd-coin',
    },
  ],
};

export const CloudAccountController =
  '0x72b9EB24BFf9897faD10B3100D35CEE8eDF8E43b';
export const CloudPublicKeyEncryption = `
-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAtflt9yF4G1bPqTHtOch47UW9hkSi4u2EZDHYLLSKhGMwvHjajTM+
wcgxV8dlaTh1av/2dWb1EE3UMK0KF3CB3TZ4t/p+aQGhyfsGtBbXZuwZAd8CotTn
BLRckt6s3jPqDNR3XR9KbfXzFObNafXYzP9vCGQPdJQzuTSdx5mWcPpK147QfQbR
K0gmiDABYJMMUos8qaiKVQmSAwyg6Lce8x+mWvFAZD0PvaTNwYqcY6maIztT6h/W
mfQHzt9Z0nwQ7gv31KCw0Tlh7n7rMnDbr70+QVd8e3qMEgDYnx7Jm4BzHjr56IvC
g5atj1oLBlgH6N/9aUIlP5gkw89O3hYJ0QIDAQAB
-----END RSA PUBLIC KEY-----
`;
