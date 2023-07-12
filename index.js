const { execSync } = require('child_process');
const { exit } = require('process');

console.log("Motion Live555 Autoconf")

function runCommand(commandString) {
    let result = {};
    try {
        result.output = execSync(commandString, { stdio: 'pipe' }).toString();
        result.code = 0;
    }
    catch (error) {
        result.output = error.stderr.toString();
        if (result.output.includes("apt does not have a stable CLI interface")) {
            result.output = result.output.split('\n');
            result.output.splice(0, 3);
            result.output = result.output.join('');
        }
        result.code = error.status;
    }
    return result;
};

function installPackage(packageName, checkExecutable = packageName) {
    var result = { installed: false, checked: false };
    console.log(`Installing package '${packageName}'...`)
    let commandString = `apt -y install ${packageName}`;

    var installResult = runCommand(commandString);
    if (installResult.code == 0) {
        result.installed = true;
        let checkInstallResult = checkPackageInstallation(checkExecutable);
        if (checkInstallResult.code == 0) {
            result.checked = true;
        } else {
            console.log(`${packageName} installation check failed`);
        }
    } else {
        console.log(`${packageName} installation exited with error code ${installResult.code}`)
    }

    checkInstallOp(packageName, result)

}

function checkPackageInstallation(packageName) {
    console.log(`Checking ${packageName} installation....`)
    return runCommand(`which ${packageName}`);
}

function createDirectories() {
    let dirs = [
        { "path": "/var/log/motion/", "owner": "motion:motion" }
    ];
    dirs.forEach(dir => {
        runCommand(`mkdir -p ${dir.path} && chown -R ${dir.owner} ${dir.path}`)
        console.log(`Created directory ${dir.path} with owner ${dir.owner}`)
    });
}

function checkInstallOp(target, ec) {
    if (ec.installed && ec.checked) {
        console.log(`${target} successfully installed!`);
    } else {
        console.log(`There was an error during the installation of ${target}:`)
        console.log(ec);
        exit(1);
    }
}

/******************REPO PACKAGES***********************/

createDirectories();

installPackage("motion");
installPackage("git");
installPackage("build-essential", "make");
installPackage("libssl-dev", "openssl");

/******************NON-REPO PACKAGES***********************/

let live555Downloaded = runCommand(`ls /tmp/live555`);
let ghRepo = "https://github.com/rgaufman/live555.git";

if (live555Downloaded.code != 0) { //if the directory doesn't exist
    console.log(`Cloning live555 from the official Github repo...[${ghRepo}]`)
    let live555Clone = runCommand(`cd /tmp && git clone ${ghRepo}`);

    if (live555Clone.code != 0) {
        console.log(`There was an error during the clone operation of Live555:`)
        console.log(live555Clone);
        exit(1);
    }else{
        console.log(`Successfully cloned Live555 from official repo`)
    }

} else {
    console.log(`Live555 directory found in /tmp, presuming it's our repo...[${ghRepo}]`);
}

console.log("Generating make files for live555...")
let genMakefiles = runCommand(`cd /tmp/live555 && ./genMakefiles linux`);

if (genMakefiles.code != 0) {
    console.log(`There was an error during the generation of make files for Live555:`)
    console.log(genMakefiles);
    exit(1);
}else{
    console.log(`Successfully generated Live555 make files`)
}

console.log("Compiling...")
let live555make = runCommand(`cd /tmp/live555 && make -j4`);

if (live555make.code != 0) {
    console.log(`There was an error during the compile operation of Live555:`)
    console.log(live555make);
    exit(1);
}else{
    console.log(`Successfully compiled Live555 binaries`)
}

console.log("Extracting live555ProxyServer binary to /usr/bin/ and making it executable...")
let live555ProxyExtractAndX = runCommand(`cd /tmp/live555/proxyServer && \
                                      chmod +x live555ProxyServer && \
                                      cp live555ProxyServer /usr/bin/`);

if (live555ProxyExtractAndX.code != 0) {
    console.log(`There was an error during the copy or chmod of Live555ProxyServer executable to /usr/bin/:`)
    console.log(live555ProxyExtractAndX);
    exit(1);
}else{
    console.log(`live555ProxyServer binary extracted, permissions have been set`)
}

let checkLive555InstallResult = checkPackageInstallation("live555ProxyServer");
if (checkLive555InstallResult.code == 0) {
    console.log(`live555ProxyServer has been installed successfully`);
} else {
    console.log(`live555ProxyServer installation has failed, binaries not found in /usr/bin/`);
}
