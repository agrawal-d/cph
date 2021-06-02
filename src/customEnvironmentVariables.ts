export const getArchiveFolderPath = (): string => {
    return "/home/aryan/cp-archive";
};

export const getInitialText = (): string => {
    let date_ob = new Date();

    // current date
    // adjust 0 before single digit date
    let date = ("0" + date_ob.getDate()).slice(-2);

    // current month
    let month_name = date_ob.toLocaleString('default', { month: 'long' });

    // current year
    let year = date_ob.getFullYear();

    let today_string = date + "-" + month_name + "-" + year + " " + date_ob.toLocaleTimeString('en-US', { hour12: false });

    let str = '';
    str += '\n';
    str += '//\tparsed : ' + today_string + ' IST';

    return str;
}