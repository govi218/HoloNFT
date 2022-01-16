//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract HoloNFT is ERC721URIStorage, Ownable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    uint public constant PRICE = 0.01 ether;

    constructor() ERC721("HoloNFT", "HNFT") {}

    function reserveNFT(string memory tokenURI) public onlyOwner {
            _mintSingleNFT(tokenURI);
    }

    function mintNFT(string memory URI) public payable {
        require(msg.value >= PRICE, "Not enough ether to purchase NFTs.");
        _mintSingleNFT(URI);
    }

    function _mintSingleNFT(string memory tokenURI) private {
        uint newTokenID = _tokenIds.current();
        _safeMint(msg.sender, newTokenID);
        _setTokenURI(newTokenID, tokenURI);
        _tokenIds.increment();
    }

    function withdraw() public payable onlyOwner {
        uint balance = address(this).balance;
        require(balance > 0, "No ether left to withdraw");

        (bool success, ) = (msg.sender).call{value: balance}("");
        require(success, "Transfer failed.");
    }
}
