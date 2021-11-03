/* eslint-disable no-restricted-syntax */
const getMagnifierValue = ratio => {
    const array = [...Array(20).keys()];
    let magnifierValue;

    for (const index of array) {
        if (index > ratio) {
            magnifierValue = index - 1;
            break;
        }
    }

    return magnifierValue;
};

export default getMagnifierValue;