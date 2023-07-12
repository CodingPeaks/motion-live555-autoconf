const { execSync } = require('child_process');

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

function installPackage(packageName) {
    var result = { installed: false, checked: false };
    console.log(`Installing package '${packageName}'...`)
    let commandString = `apt -y install ${packageName}`;

    var installResult = runCommand(commandString);
    if (installResult.code == 0) {
        result.installed = true;
        let checkInstallResult = checkPackageInstallation(packageName);
        if (checkInstallResult.code == 0) {
            result.checked = true;
        }else{
            console.log(`${packageName} installation check failed`);
        }
    }else{
        console.log(`${packageName} installation exited with error code ${installResult.code}`)
    }

    return result;
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

/*********************************************/

createDirectories();

let motion = installPackage("motion");
if(motion.installed && motion.checked){
    console.log("Motion successfully installed!");
}