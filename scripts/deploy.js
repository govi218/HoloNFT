async function main() {
  const HoloNFT = await ethers.getContractFactory("HoloNFT")

  // Start deployment, returning a promise that resolves to a contract object
  const holoNFT = await HoloNFT.deploy()
  console.log("Contract deployed to address:", holoNFT.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
