import { canonize } from "./canonize.js"
import { getSuffPref } from "./getSuffPref.js";
import { getList } from "./storageWorker.js"
import { updateList } from "./storageWorker.js"


function truncate(arr, bytes) {
    let truncArr = [];

    for (let elem of arr) {
        truncArr.push(elem.substring(0, bytes * 2));
    }
    return truncArr;
}

async function realTimeCheckMode(expressionHashes) {
    // [!] add a reason for each `UNSAFE` verdict

    let gc = await getList("gc");
    console.log(gc);

    for (let hash of expressionHashes) {
        for (let elem of gc) {
            if (elem == hash) {
                console.log("expressionHash in gc");
                return "UNSURE";
            }
        }
    }

    let expressionHashPrefixes = truncate(expressionHashes, 4);
    let lc = await getList("lc"); // = local cache; [{expiration_1, fullHash_1}, {expiration_2, fullHash_2}, ... ]
    console.log(lc);

    let currentTime = new Date();
    console.log(currentTime);

    for (let i = 0; i < expressionHashPrefixes.length; i++) {
        let expressionHashPrefix = expressionHashPrefixes[i];

        for (let j = 0; j < lc.length; j++) {
            let arr = lc[j];

            if (arr[1].startsWith(expressionHashPrefix)) {
                if (currentTime > arr[0]) { // <------------------------------ `expiration` may be in wrong format [!]
                    lc.splice(j, 1);
                    updateList("lc", lc);

                } else {
                    expressionHashPrefixes.splice(i, 1);

                    // [?] Check whether the corresponding full hash within expressionHashes is found in the cached entry:
                    for (let a of lc) { 
                        if (a == expressionHashes[j]) {
                            return "UNSAFE";
                        }
                    }
                }
            }
        }

        /* 
        method hashes.search

        send expressionHashPrefixes
        
        [!] If an error occurred (including network errors, HTTP errors, etc), return UNSURE
        */
    }

    let response = []; // = response received from the SB server

    // [!] set an alarm for `expiration time` from response

    for (let fullHash of response) { // <----------------------------------------------------------------------- [!]
        lc.push(["myExpirationTime", fullHash]);
    }

    for (let fullHash of response) { 
        for (let hash of expressionHashes) {
            if (hash == fullHash) {
                return "UNSAFE";
            }
        }
    }

    return "SAFE";
}


async function localThreatListMode(expressionHashes) {
    let expressionHashPrefixes = truncate(expressionHashes, 4);

    let lc = await getList("lc"); // = local cache; [{expiration_1, fullHash_1}, {expiration_2, fullHash_2}, ... ]
    console.log(lc);

    for (let expressionHashPrefix of expressionHashPrefixes) {
        for (let j = 0; j < lc.length; j++) {
            let arr = lc[j];

            if (arr[1].startsWith(expressionHashPrefix)) {
                if (currentTime > arr[0]) { // <------------------------------ `expiration` may be in wrong format [!]
                    lc.splice(j, 1);
                    updateList("lc", lc);

                } else {
                    expressionHashPrefixes.splice(i, 1);

                    // [?] Check whether the corresponding full hash within expressionHashes is found in the cached entry:
                    for (let a of lc) { 
                        if (a == expressionHashes[j]) {
                            return "UNSAFE";
                        }
                    }
                }
            }
        }
    }

    for (let i = 0; i < expressionHashPrefixes.length; i++) {
        let expressionHashPrefix = expressionHashPrefixes[i];
        let localThreatLists = ["se", "mw", "uws", "uwsa", "pha"];
        let flagFound = false;

        for (let name of localThreatLists) {
            let list = await getList(name);

            for (let item of list) {
                if (item.startsWith(expressionHashPrefix)) {
                    flagFound = true;
                    break;
                }
            }

            if (flagFound) {
                break;
            }
        }

        if (!flagFound) {
            expressionHashPrefixes.splice(i, 1);
            i--;
        }
    }

    /* 
    method hashes.search 
    
    send expressionHashPrefixes
    
    [!] If an error occurred (including network errors, HTTP errors, etc), return UNSURE
    */


    let response = [];

    // [!] set an alarm for `expiration time` from response

    for (let fullHash of response) { // <----------------------------------------------------------------------- [!]
        lc.push(["myExpirationTime", fullHash]);
    }

    for (let fullHash of response) { 
        for (let hash of expressionHashes) {
            if (hash == fullHash) {
                return "UNSAFE";
            }
        }
    }

    return "SAFE";
}

export async function checkURL(url) {
    let u = canonize(url);
    let expressions = getSuffPref(u);
    let expressionHashes = [ // <---------------------------------------------------------- get it from `hashing` [!]
        "jghgh"
    ];  

    let verdict = await realTimeCheckMode(expressionHashes);

    console.log(verdict);

    if (verdict == "UNSURE") {
        verdict = await localThreatListMode(expressionHashes);
    }

    console.log(url);
    console.log(expressions);
    console.log(expressionHashes);
    console.log(verdict);
    console.log("");

    return verdict;
}