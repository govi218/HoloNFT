async function main() {
  const NeuroNFT = await ethers.getContractFactory("NeuroNFT")

  // Start deployment, returning a promise that resolves to a contract object
  const NeuroNFTDep = await NeuroNFT.deploy()
  console.log("Contract deployed to address:", NeuroNFTDep.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
